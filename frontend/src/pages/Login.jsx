import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FarmarcasLogo from '../components/FarmarcasLogo';
import { IconEye, IconEyeOff, IconAlert } from '../components/Icons';

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
      setError(err.response?.data?.error || 'Erro ao efetuar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-glow" />
      <div className="login-card fade-in">
        <div className="login-logo">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <FarmarcasLogo width={64} height={64} />
          </div>
          <div className="login-logo-title">MVP ESTOQUE</div>
          <div className="login-logo-sub">Sistema de Gestão Preditiva de Estoque · TI Farmarcas</div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error">
              <IconAlert size={16} /> {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">E-mail corporativo</label>
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
                placeholder="Sua senha de acesso"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, marginTop: 8 }}
            disabled={loading}
          >
            {loading ? <><div className="spinner" style={{width:16, height:16}}></div> Acessando...</> : 'Entrar no Sistema'}
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
