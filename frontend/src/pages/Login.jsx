import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-glow" />
      <div className="login-card fade-in">
        <div className="login-logo">
          <div className="login-logo-icon">📦</div>
          <div className="login-logo-title">Estoque TI</div>
          <div className="login-logo-sub">Sistema de Gestão Preditiva · Farmarcas</div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">⚠ {error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email corporativo</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="seu.email@farmarcas.com.br"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16 }}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, marginTop: 8 }}
            disabled={loading}
          >
            {loading ? <><div className="spinner" style={{width:16, height:16}}></div> Entrando...</> : 'Entrar no Sistema'}
          </button>
        </form>

        <div style={{ marginTop: 32, padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Credenciais de Teste Master</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}><strong>Admin:</strong> admin@farmarcas.com.br | MASter@0102</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}><strong>TI:</strong> ti@farmarcas.com.br | TI@farmarcas2024</p>
        </div>
      </div>
    </div>
  );
}
