const { verifyAccessToken } = require('../services/jwtService');
const db = require('../database/db');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  const user = db.prepare('SELECT id, name, email, role, is_active FROM users WHERE id = ?').get(payload.id);
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
  }

  req.user = user;
  next();
}

module.exports = { authMiddleware };
