const { sql, initializeDB } = require('../lib/db');
const { requireAuth, requireAdmin } = require('./auth');
const CORS = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization' };
module.exports = async function handler(req, res) {
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    await initializeDB();
    if (req.method === 'GET') {
      requireAuth(req, res);
      const { rows } = await sql.query('SELECT * FROM categories ORDER BY name');
      return res.json(rows);
    }
    if (req.method === 'POST') {
      requireAdmin(req, res);
      const { name } = req.body;
      try {
        const { rows } = await sql.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [name]);
        return res.status(201).json({ id: rows[0].id, name });
      } catch(e) { return res.status(400).json({ error: 'Category already exists' }); }
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
};
