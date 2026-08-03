function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Acesso negado. Requer perfil: ${roles.join(' ou ')}` });
    }
    next();
  };
}

module.exports = { requireRole };
