import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FarmarcasLogo from '../components/FarmarcasLogo';
import { IconEye, IconEyeOff, IconAlert, IconCheck } from '../components/Icons';
import api from '../services/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Token de redefinição ausente ou inválido.');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-expired-password', {
        token,
        newPassword: password,
      });

      setSuccess(data.message || 'Senha redefinida com sucesso!');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao redefinir a senha. O link pode ter expirado.');
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
          <div className="login-logo-title">ESTOQUE</div>
          <div className="login-logo-sub">Redefinição de Senha Expirada · TI Farmarcas</div>
        </div>

        {error && (
          <div className="alert alert-error mb-16">
            <IconAlert size={16} /> {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success mb-16">
            <IconCheck size={16} /> {success}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, textAlign: 'center', lineHeight: 1.5 }}>
              Sua senha expirou por política de segurança de 90 dias. Por favor, cadastre uma nova senha forte abaixo.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="new-password">Nova Senha (mín. 8 caracteres) *</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Nova senha de acesso"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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

            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">Confirmar Nova Senha *</label>
              <input
                id="confirm-password"
                type="password"
                className="form-input"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, marginTop: 8 }}
              disabled={loading || !token}
            >
              {loading ? <><div className="spinner" style={{ width: 16, height: 16 }}></div> Salvando...</> : 'Salvar Nova Senha'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/login')}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    </div>
  );
}
