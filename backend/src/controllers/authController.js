const bcrypt = require('bcryptjs');
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

        // Verificar se a senha expirou (90 dias)
        const passwordChangedAt = user.password_changed_at || user.created_at;
        const passwordDate = new Date(passwordChangedAt);
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        if (passwordDate < ninetyDaysAgo) {
            const crypto = require('crypto');
            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hora

            db.prepare('UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?')
              .run(resetToken, expiresAt, user.id);

            const emailService = require('../services/emailService');
            await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);

            return res.status(403).json({
                error: 'Sua senha expirou por ter mais de 90 dias. Um e-mail de alteração de senha foi enviado para você.',
                expired: true,
                email: user.email
            });
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
        db.prepare(`
            UPDATE users 
            SET password_hash = ?, 
                password_changed_at = datetime('now'), 
                reset_token = NULL, 
                reset_token_expires_at = NULL, 
                updated_at = datetime('now') 
            WHERE id = ?
        `).run(newHash, req.user.id);
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
        db.prepare(`
            UPDATE users 
            SET password_hash = ?, 
                password_changed_at = datetime('now'), 
                reset_token = NULL, 
                reset_token_expires_at = NULL, 
                updated_at = datetime('now') 
            WHERE id = ?
        `).run(hash, userId);
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

async function requestAccess(req, res) {
    try {
        const { email, name, role, reason } = req.body;
        if (!email || !name) {
            return res.status(400).json({ error: 'E-mail e nome são obrigatórios' });
        }
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail.endsWith('@farmarcas.com.br')) {
            return res.status(400).json({ error: 'Apenas e-mails corporativos @farmarcas.com.br são permitidos.' });
        }

        db.prepare(`
            INSERT INTO access_requests (email, name, role, reason, status)
            VALUES (?, ?, ?, ?, 'PENDING')
        `).run(cleanEmail, name.trim(), role || 'TI', reason ? reason.trim() : '');

        return res.status(201).json({ message: 'Solicitação enviada com sucesso! O Administrador foi notificado no painel.' });
    } catch (err) {
        return res.status(500).json({ error: 'Erro interno ao processar solicitação' });
    }
}

async function firstAccess(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' });
        }

        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail.endsWith('@farmarcas.com.br')) {
            return res.status(400).json({ error: 'Apenas e-mails corporativos @farmarcas.com.br são permitidos.' });
        }

        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
        if (existingUser) {
            return res.status(400).json({ error: 'Este e-mail já possui uma conta ativa. Faça login com sua senha.' });
        }

        const authItem = db.prepare('SELECT * FROM authorized_emails WHERE email = ?').get(cleanEmail);
        const reqItem = db.prepare('SELECT * FROM access_requests WHERE email = ? AND status = "APPROVED"').get(cleanEmail);

        if (!authItem && !reqItem) {
            return res.status(403).json({
                error: 'E-mail não pré-autorizado ou pendente de aprovação pelo Administrador. Por favor, utilize a aba "Solicitar Acesso".'
            });
        }

        const name = (authItem && authItem.name) || (reqItem && reqItem.name) || cleanEmail.split('@')[0];
        const role = (authItem && authItem.role) || (reqItem && reqItem.role) || 'TI';

        const hash = await bcrypt.hash(password, 10);
        db.prepare(`
            INSERT INTO users (email, password_hash, name, role, is_active, password_changed_at)
            VALUES (?, ?, ?, ?, 1, datetime('now'))
        `).run(cleanEmail, hash, name, role);

        return res.status(201).json({ message: 'Primeiro acesso realizado e senha cadastrada com sucesso! Faça login.' });
    } catch (err) {
        return res.status(500).json({ error: 'Erro ao cadastrar primeiro acesso' });
    }
}

async function resetExpiredPassword(req, res) {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Nova senha deve ter pelo menos 8 caracteres' });
        }

        const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
        if (!user) {
            return res.status(400).json({ error: 'Token de alteração inválido' });
        }

        const expiresAt = new Date(user.reset_token_expires_at);
        if (expiresAt < new Date()) {
            return res.status(400).json({ error: 'Token de alteração expirado' });
        }

        const newHash = await bcrypt.hash(newPassword, 12);
        db.prepare(`
            UPDATE users 
            SET password_hash = ?, 
                password_changed_at = datetime('now'), 
                reset_token = NULL, 
                reset_token_expires_at = NULL, 
                updated_at = datetime('now') 
            WHERE id = ?
        `).run(newHash, user.id);

        revokeUserTokens(user.id);

        return res.json({ message: 'Senha alterada com sucesso! Agora você pode fazer login.' });
    } catch (err) {
        console.error('[AUTH] Reset expired password error:', err);
        return res.status(500).json({ error: 'Erro interno ao alterar senha' });
    }
}

module.exports = { login, refresh, logout, changePassword, adminResetPassword, getMe, requestAccess, firstAccess, resetExpiredPassword };
