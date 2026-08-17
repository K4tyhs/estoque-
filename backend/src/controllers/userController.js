const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { sendAccessApprovalEmail } = require('../services/emailService');

function getUsers(req, res) {
  try {
    const users = db.prepare('SELECT id, email, name, role, is_active, created_at, updated_at FROM users ORDER BY name ASC').all();
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createUser(req, res) {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@farmarcas.com.br')) {
      return res.status(400).json({ error: 'Apenas e-mails corporativos @farmarcas.com.br são permitidos.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'Este e-mail já possui uma conta no sistema' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare(
      "INSERT INTO users (email, password_hash, name, role, is_active, password_changed_at) VALUES (?, ?, ?, ?, 1, datetime('now'))"
    ).run(cleanEmail, hash, name.trim(), role || 'TI');

    db.prepare('INSERT OR IGNORE INTO authorized_emails (email, role, name) VALUES (?, ?, ?)').run(cleanEmail, role || 'TI', name.trim());

    return res.status(201).json({ id: result.lastInsertRowid, email: cleanEmail, name, role: role || 'TI' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Não é possível desativar sua própria conta' });
    }

    db.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(is_active ? 1 : 0, id);
    return res.json({ message: `Usuário ${is_active ? 'ativado' : 'desativado'} com sucesso` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function deleteUser(req, res) {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Não é possível remover sua própria conta' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return res.json({ message: 'Usuário removido com sucesso' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function getAuthorizedEmails(req, res) {
  try {
    const list = db.prepare('SELECT * FROM authorized_emails ORDER BY created_at DESC').all();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function addAuthorizedEmail(req, res) {
  try {
    const { email, role, name } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@farmarcas.com.br')) {
      return res.status(400).json({ error: 'Apenas e-mails corporativos @farmarcas.com.br podem ser autorizados.' });
    }

    const result = db.prepare(
      'INSERT INTO authorized_emails (email, role, name) VALUES (?, ?, ?)'
    ).run(cleanEmail, role || 'TI', name ? name.trim() : '');

    const userName = name ? name.trim() : cleanEmail.split('@')[0];
    sendAccessApprovalEmail(cleanEmail, userName).catch(err => {
      console.error('Erro ao enviar e-mail de aprovação de acesso:', err);
    });

    return res.status(201).json({ id: result.lastInsertRowid, email: cleanEmail, role: role || 'TI', name });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Este e-mail já está autorizado' });
    }
    return res.status(500).json({ error: err.message });
  }
}

function removeAuthorizedEmail(req, res) {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM authorized_emails WHERE id = ?').run(id);
    return res.json({ message: 'E-mail removido das autorizações' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function getAccessRequests(req, res) {
  try {
    const requests = db.prepare('SELECT * FROM access_requests ORDER BY created_at DESC').all();
    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function approveAccessRequest(req, res) {
  try {
    const { id } = req.params;
    const reqItem = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(id);
    if (!reqItem) return res.status(404).json({ error: 'Solicitação não encontrada' });

    db.prepare(
      "UPDATE access_requests SET status = 'APPROVED', processed_at = datetime('now') WHERE id = ?"
    ).run(id);

    db.prepare(
      'INSERT OR IGNORE INTO authorized_emails (email, role, name) VALUES (?, ?, ?)'
    ).run(reqItem.email, reqItem.role || 'TI', reqItem.name || '');

    sendAccessApprovalEmail(reqItem.email, reqItem.name || reqItem.email.split('@')[0]).catch(err => {
      console.error('Erro ao enviar e-mail de aprovação de acesso:', err);
    });

    return res.json({ message: 'Solicitação aprovada e e-mail pré-autorizado com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function rejectAccessRequest(req, res) {
  try {
    const { id } = req.params;
    db.prepare(
      "UPDATE access_requests SET status = 'REJECTED', processed_at = datetime('now') WHERE id = ?"
    ).run(id);
    return res.json({ message: 'Solicitação recusada' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getUsers,
  createUser,
  toggleUserStatus,
  deleteUser,
  getAuthorizedEmails,
  addAuthorizedEmail,
  removeAuthorizedEmail,
  getAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
};
