const bcrypt = require('bcrypt');
const db = require('../database/db');
const { generateTokens, storeRefreshToken, verifyRefreshToken, revokeUserTokens } = require('../services/jwtService');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await storeRefreshToken(user.id, refreshToken);

    return res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}

async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token obrigatório' });

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) return res.status(401).json({ error: 'Refresh token inválido ou expirado' });

    const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

    const tokens = generateTokens(user);
    await storeRefreshToken(user.id, tokens.refreshToken);

    return res.json({
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
}

async function logout(req, res) {
  try {
    revokeUserTokens(req.user.id);
    return res.json({ message: 'Logout realizado com sucesso' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 8 caracteres' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(newHash, req.user.id);
    revokeUserTokens(req.user.id);

    return res.json({ message: 'Senha alterada com sucesso. Faça login novamente.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
}

async function adminResetPassword(req, res) {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'userId e newPassword são obrigatórios' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
    }
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const hash = await bcrypt.hash(newPassword, 12);
    db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, userId);
    revokeUserTokens(userId);
    return res.json({ message: 'Senha redefinida com sucesso' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
}

function getMe(req, res) {
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  return res.json(user);
}

module.exports = { login, refresh, logout, changePassword, adminResetPassword, getMe };
