const { sql, initializeDB } = require('../lib/db');
const { requireAuth } = require('./auth');
const CORS = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization' };
module.exports = async function handler(req, res) {
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    await initializeDB();
    const user = requireAuth(req, res); if (!user) return;
    const { code } = req.query;
    const { rows } = await sql.query('SELECT p.*,c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE (p.code=$1 OR p.barcode=$1) AND p.active=1', [code]);
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    return res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
};
