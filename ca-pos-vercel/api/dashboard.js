const { sql, initializeDB } = require('../lib/db');
const { requireAuth } = require('./auth');
const CORS = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization' };

module.exports = async function handler(req, res) {
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    await initializeDB();
    const user = requireAuth(req, res); if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const { rows: [todaySales] } = await sql.query(`SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as count FROM sales WHERE DATE(created_at)=$1 AND status='completed'`, [today]);
    const { rows: [weekSales] } = await sql.query(`SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as count FROM sales WHERE created_at >= NOW()-INTERVAL '7 days' AND status='completed'`);
    const { rows: [monthSales] } = await sql.query(`SELECT COALESCE(SUM(total),0) as revenue FROM sales WHERE TO_CHAR(created_at::timestamp,'YYYY-MM')=TO_CHAR(NOW(),'YYYY-MM') AND status='completed'`);
    const { rows: [{ c: totalProducts }] } = await sql.query(`SELECT COUNT(*) as c FROM products WHERE active=1`);
    const { rows: [{ c: lowStock }] } = await sql.query(`SELECT COUNT(*) as c FROM products WHERE stock <= low_stock_threshold AND active=1`);
    const { rows: [{ c: outOfStock }] } = await sql.query(`SELECT COUNT(*) as c FROM products WHERE stock=0 AND active=1`);
    const { rows: topProducts } = await sql.query(`SELECT si.product_name,SUM(si.quantity) as sold,SUM(si.subtotal) as revenue FROM sale_items si JOIN sales s ON si.sale_id=s.id WHERE s.status='completed' GROUP BY si.product_name ORDER BY sold DESC LIMIT 5`);
    const { rows: recentSales } = await sql.query(`SELECT s.*,u.name as cashier_name FROM sales s LEFT JOIN users u ON s.cashier_id=u.id WHERE s.status='completed' ORDER BY s.created_at DESC LIMIT 10`);
    const { rows: lowStockItems } = await sql.query(`SELECT id,code,name,stock,low_stock_threshold FROM products WHERE stock <= low_stock_threshold AND active=1 ORDER BY stock ASC`);

    res.json({ todaySales, weekSales, monthSales, totalProducts: parseInt(totalProducts), lowStock: parseInt(lowStock), outOfStock: parseInt(outOfStock), topProducts, recentSales, lowStockItems });
  } catch(e) { console.error(e); res.status(500).json({ error: e.message }); }
};
