const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database/db');

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';
const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function generateTokens(user) {
    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRY });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });

    return { accessToken, refreshToken };
}

async function storeRefreshToken(userId, token) {
    const hash = await bcrypt.hash(token, 8);
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS).toISOString();
    db.prepare(`
    DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < datetime('now')
  `).run(userId);
    db.prepare(`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)
  `).run(userId, hash, expiresAt);
}

async function verifyRefreshToken(token) {
    try {
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const tokens = db.prepare(`
      SELECT * FROM refresh_tokens WHERE user_id = ? AND expires_at > datetime('now')
    `).all(payload.id);

        for (const stored of tokens) {
            const match = await bcrypt.compare(token, stored.token_hash);
            if (match) {
                db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);
                return payload;
            }
        }
        return null;
    } catch {
        return null;
    }
}

function verifyAccessToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return null;
    }
}

function revokeUserTokens(userId) {
    db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
}

module.exports = { generateTokens, storeRefreshToken, verifyRefreshToken, verifyAccessToken, revokeUserTokens };
