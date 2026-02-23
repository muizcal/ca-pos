const bcrypt = require('bcryptjs');
const { sql, initializeDB } = require('../lib/db');
const { requireAuth, requireAdmin } = require('./auth');
const CORS = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization' };
module.exports = async function handler(req, res) {
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    await initializeDB();
    if (req.method === 'GET') {
      requireAdmin(req, res);
      const { rows } = await sql.query('SELECT id,username,name,role,active,created_at,last_login FROM users ORDER BY name');
      return res.json(rows);
    }
    if (req.method === 'POST') {
      requireAdmin(req, res);
      const { username, password, name, role } = req.body;
      try {
        const hash = bcrypt.hashSync(password, 10);
        const { rows } = await sql.query('INSERT INTO users (username,password,name,role) VALUES ($1,$2,$3,$4) RETURNING id', [username, hash, name, role]);
        return res.status(201).json({ id: rows[0].id, username, name, role });
      } catch(e) { return res.status(400).json({ error: 'Username already exists' }); }
    }
    if (req.method === 'DELETE') {
      const user = requireAdmin(req, res); if (!user) return;
      const { id } = req.query;
      if (parseInt(id) === user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
      await sql.query('DELETE FROM users WHERE id=$1', [id]);
      return res.json({ message: 'Deleted' });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
};
