const { sql, initializeDB } = require('../lib/db');
const { requireAdmin } = require('./auth');
const CORS = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization' };
module.exports = async function handler(req, res) {
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    await initializeDB();
    const user = requireAdmin(req, res); if (!user) return;
    if (req.method === 'POST') {
      const { id } = req.query;
      const { quantity_change, type, note } = req.body;
      const { rows: [product] } = await sql.query('SELECT * FROM products WHERE id=$1', [id]);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      const newStock = product.stock + parseInt(quantity_change);
      if (newStock < 0) return res.status(400).json({ error: 'Stock cannot go below 0' });
      await sql.query(`UPDATE products SET stock=$1, updated_at=to_char(now(),'YYYY-MM-DD HH24:MI:SS') WHERE id=$2`, [newStock, id]);
      await sql.query('INSERT INTO stock_movements (product_id,type,quantity_change,quantity_before,quantity_after,note,user_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [id, type, quantity_change, product.stock, newStock, note||null, user.id]);
      return res.json({ message: 'Stock adjusted', new_stock: newStock });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
};
