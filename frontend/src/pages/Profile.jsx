import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const ROLE_LABELS = { ADMIN: 'Administrador', TI: 'Equipe TI', PATRIMONIO: 'Patrimônio' };

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 5000); };

  const changePassword = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      return showToast('As senhas não conferem', 'error');
    }
    if (form.newPassword.length < 8) {
      return showToast('A nova senha deve ter pelo menos 8 caracteres', 'error');
    }
    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      showToast('Senha alterada! Faça login novamente.');
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-container fade-in">
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999 }}>
          <div className={`alert alert-${toast.type === 'error' ? 'error' : 'success'}`} style={{ minWidth: 280 }}>
            {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
          </div>
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">👤 Meu Perfil</h1>
        <p className="page-subtitle">Informações da sua conta</p>
      </div>

      <div className="grid-2" style={{ maxWidth: 800 }}>
        <div className="card">
          <div className="section-title mb-16">Informações da Conta</div>
          <div className="flex-col gap-16">
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Nome</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{user?.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Email</div>
              <div style={{ color: 'var(--text-secondary)' }}>{user?.email}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>Perfil de Acesso</div>
              <span className={`badge badge-${user?.role?.toLowerCase()}`}>{ROLE_LABELS[user?.role]}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title mb-16">🔐 Alterar Senha</div>
          <form onSubmit={changePassword}>
            <div className="form-group">
              <label className="form-label">Senha Atual *</label>
              <input type="password" className="form-input" required value={form.currentPassword} onChange={e => setForm({...form, currentPassword: e.target.value})} placeholder="Sua senha atual" />
            </div>
            <div className="form-group">
              <label className="form-label">Nova Senha *</label>
              <input type="password" className="form-input" required minLength={8} value={form.newPassword} onChange={e => setForm({...form, newPassword: e.target.value})} placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar Nova Senha *</label>
              <input type="password" className="form-input" required minLength={8} value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} placeholder="Repita a nova senha" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <><div className="spinner" style={{width:16,height:16}}></div> Salvando...</> : 'Alterar Senha'}
            </button>
          </form>
          <div className="alert alert-warning mt-16">
            ⚠️ Após alterar a senha, você será desconectado automaticamente.
          </div>
        </div>
      </div>
    </div>
  );
}
