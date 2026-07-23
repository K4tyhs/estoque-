const bcrypt = require('bcrypt');
const db = require('../database/db');

function getUsers(req, res) {
  const users = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY role, name').all();
  return res.json(users);
}

async function createUser(req, res) {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Nome, email, senha e perfil são obrigatórios' });
  }
  if (!['ADMIN', 'TI', 'PATRIMONIO'].includes(role)) {
    return res.status(400).json({ error: 'Perfil inválido' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(400).json({ error: 'Email já cadastrado' });

  const hash = await bcrypt.hash(password, 12);
  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)
  `).run(name, email.toLowerCase().trim(), hash, role);

  if (role !== 'ADMIN') {
    const authEx = db.prepare('SELECT id FROM authorized_emails WHERE email = ?').get(email.toLowerCase().trim());
    if (!authEx) {
      db.prepare('INSERT INTO authorized_emails (email, role, name, created_by) VALUES (?, ?, ?, ?)').run(email.toLowerCase().trim(), role, name, req.user.id);
    }
  }

  return res.status(201).json({ id: result.lastInsertRowid, message: 'Usuário criado' });
}

function toggleUserStatus(req, res) {
  const { is_active } = req.body;
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'Não é possível desativar seu próprio usuário' });
  db.prepare(`UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).run(is_active ? 1 : 0, req.params.id);
  return res.json({ message: `Usuário ${is_active ? 'ativado' : 'desativado'}` });
}

function getAuthorizedEmails(req, res) {
  const emails = db.prepare('SELECT ae.*, u.name as created_by_name FROM authorized_emails ae LEFT JOIN users u ON ae.created_by = u.id ORDER BY ae.role, ae.email').all();
  return res.json(emails);
}

function addAuthorizedEmail(req, res) {
  const { email, role, name } = req.body;
  if (!email || !role) return res.status(400).json({ error: 'Email e perfil são obrigatórios' });
  if (!['TI', 'PATRIMONIO'].includes(role)) return res.status(400).json({ error: 'Perfil inválido' });
  const ex = db.prepare('SELECT id FROM authorized_emails WHERE email = ?').get(email.toLowerCase().trim());
  if (ex) return res.status(400).json({ error: 'Email já autorizado' });
  const result = db.prepare('INSERT INTO authorized_emails (email, role, name, created_by) VALUES (?, ?, ?, ?)').run(email.toLowerCase().trim(), role, name || null, req.user.id);
  return res.status(201).json({ id: result.lastInsertRowid, message: 'Email autorizado' });
}

function removeAuthorizedEmail(req, res) {
  const ae = db.prepare('SELECT id FROM authorized_emails WHERE id = ?').get(req.params.id);
  if (!ae) return res.status(404).json({ error: 'Email não encontrado' });
  db.prepare('DELETE FROM authorized_emails WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Email removido da lista autorizada' });
}

module.exports = { getUsers, createUser, toggleUserStatus, getAuthorizedEmails, addAuthorizedEmail, removeAuthorizedEmail };
