import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { IconPlus, IconTrash, IconCheck, IconAlert, IconCross } from '../components/Icons';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [authEmails, setAuthEmails] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'TI' });
  const [emailForm, setEmailForm] = useState({ email: '', role: 'TI', name: '' });
  const [resetForm, setResetForm] = useState({ userId: '', newPassword: '' });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const load = async () => {
    try {
      const [ur, er, reqRes] = await Promise.allSettled([
        api.get('/users'),
        api.get('/users/authorized-emails'),
        api.get('/users/access-requests'),
      ]);
      if (ur.status === 'fulfilled') setUsers(ur.value.data || []);
      if (er.status === 'fulfilled') setAuthEmails(er.value.data || []);
      if (reqRes.status === 'fulfilled') setAccessRequests(reqRes.value.data || []);
    } catch (err) {
      console.error('[USERS] Error loading users:', err);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      showToast('Usuário criado com sucesso!');
      setModal(null); load();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao criar usuário', 'error'); }
  };

  const toggleStatus = async (userId, is_active) => {
    try {
      await api.put(`/users/${userId}/status`, { is_active });
      showToast(is_active ? 'Usuário ativado' : 'Usuário desativado');
      load();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao alterar status', 'error'); }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Deseja realmente remover permanentemente este usuário do sistema?')) return;
    try {
      await api.delete(`/users/${userId}`);
      showToast('Usuário removido do sistema');
      load();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao remover usuário', 'error'); }
  };

  const addEmail = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/authorized-emails', emailForm);
      showToast('E-mail autorizado cadastrado com sucesso!');
      setModal(null); load();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao cadastrar e-mail', 'error'); }
  };

  const removeEmail = async (id) => {
    if (!confirm('Remover este e-mail da lista de e-mails autorizados?')) return;
    try {
      await api.delete(`/users/authorized-emails/${id}`);
      showToast('E-mail removido'); load();
    } catch {}
  };

  const approveRequest = async (id) => {
    try {
      const { data } = await api.put(`/users/access-requests/${id}/approve`);
      showToast(data.message || 'Solicitação aprovada com sucesso!');
      load();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao aprovar solicitação', 'error'); }
  };

  const rejectRequest = async (id) => {
    if (!confirm('Recusar esta solicitação de acesso?')) return;
    try {
      const { data } = await api.put(`/users/access-requests/${id}/reject`);
      showToast(data.message || 'Solicitação recusada');
      load();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao recusar solicitação', 'error'); }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/admin-reset-password', resetForm);
      showToast('Senha redefinida com sucesso!');
      setModal(null);
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao redefinir senha', 'error'); }
  };

  const ROLE_MAP = { ADMIN: 'badge-admin', TI: 'badge-ti', PATRIMONIO: 'badge-patrimonio' };
  const ROLE_LABELS = { ADMIN: 'Admin', TI: 'TI', PATRIMONIO: 'Patrimônio' };

  if (loading) return <div className="loading-center"><div className="spinner"></div><span>Carregando usuários...</span></div>;

  const filteredUsers = users.filter(u => {
    if (roleFilter === 'ALL') return true;
    return u.role === roleFilter;
  });

  const pendingRequests = accessRequests.filter(r => r.status === 'PENDING');

  return (
    <div className="page-container fade-in">
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999 }}>
          <div className={`alert alert-${toast.type === 'error' ? 'error' : 'success'}`} style={{ minWidth: 280, boxShadow: 'var(--shadow)' }}>
            {toast.type === 'error' ? <IconAlert /> : <IconCheck />} {toast.msg}
          </div>
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">Gestão de Usuários</h1>
        <p className="page-subtitle">Gerenciamento de contas de acesso, autorizações de e-mail e solicitações de primeiro acesso</p>
      </div>

      <div className="flex gap-8 mb-16" style={{ flexWrap: 'wrap' }}>
        <button className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('users')}>
          Usuários do Sistema
        </button>
        <button className={`btn ${tab === 'emails' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('emails')}>
          E-mails Autorizados
        </button>
        <button className={`btn ${tab === 'requests' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('requests')} style={{ position: 'relative' }}>
          Solicitações de Acesso
          {pendingRequests.length > 0 && (
            <span style={{
              marginLeft: 8,
              background: 'var(--status-critical)',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 800
            }}>
              {pendingRequests.length} novos
            </span>
          )}
        </button>
      </div>

      {tab === 'users' && (
        <div className="card">
          <div className="flex items-center justify-between mb-16" style={{ flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="section-title">Contas Cadastradas</div>
              <div className="flex gap-8 mt-8">
                <button
                  className={`btn btn-sm ${roleFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setRoleFilter('ALL')}
                >
                  Todos os Perfis ({users.length})
                </button>
                <button
                  className={`btn btn-sm ${roleFilter === 'TI' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setRoleFilter('TI')}
                >
                  TI ({users.filter(u => u.role === 'TI').length})
                </button>
                <button
                  className={`btn btn-sm ${roleFilter === 'PATRIMONIO' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setRoleFilter('PATRIMONIO')}
                >
                  Patrimônio ({users.filter(u => u.role === 'PATRIMONIO').length})
                </button>
                <button
                  className={`btn btn-sm ${roleFilter === 'ADMIN' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setRoleFilter('ADMIN')}
                >
                  Administrador ({users.filter(u => u.role === 'ADMIN').length})
                </button>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => { setForm({ name: '', email: '', password: '', role: 'TI' }); setModal('create'); }}>
              <IconPlus /> Novo Usuário
            </button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <h3>Nenhum usuário encontrado com este perfil</h3>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td><span className={`badge ${ROLE_MAP[u.role]}`}>{ROLE_LABELS[u.role]}</span></td>
                    <td><span className={`badge ${u.is_active ? 'badge-confirmed' : 'badge-cancelled'}`}>{u.is_active ? 'Ativo' : 'Inativo'}</span></td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-secondary btn-sm" onClick={() => { setResetForm({ userId: u.id, newPassword: '' }); setModal('reset'); }}>
                          Redefinir Senha
                        </button>
                        <button className={`btn btn-sm ${u.is_active ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleStatus(u.id, !u.is_active)}>
                          {u.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)} title="Remover Usuário">
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'emails' && (
        <div className="card">
          <div className="flex items-center justify-between mb-16">
            <div>
              <div className="section-title">Lista de E-mails Autorizados</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Apenas e-mails nesta lista podem definir senha no Primeiro Acesso</div>
            </div>
            <button className="btn btn-primary" onClick={() => { setEmailForm({ email: '', role: 'TI', name: '' }); setModal('email'); }}>
              <IconPlus /> Autorizar E-mail
            </button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>E-mail</th><th>Nome / Colaborador</th><th>Perfil Autorizado</th><th>Data</th><th>Ações</th></tr></thead>
              <tbody>
                {authEmails.map(ae => (
                  <tr key={ae.id}>
                    <td style={{ fontWeight: 600 }}>{ae.email}</td>
                    <td>{ae.name || '-'}</td>
                    <td><span className={`badge ${ROLE_MAP[ae.role]}`}>{ROLE_LABELS[ae.role]}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(ae.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => removeEmail(ae.id)}>
                        <IconTrash /> Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <div className="card">
          <div className="section-header mb-16">
            <div>
              <div className="section-title">Solicitações de Acesso de Novos E-mails</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>E-mails não autorizados que tentaram se cadastrar ou solicitaram liberação ao Administrador</div>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>E-mail Solicitante</th>
                  <th>Nome</th>
                  <th>Perfil Desejado</th>
                  <th>Status</th>
                  <th>Ações do Administrador</th>
                </tr>
              </thead>
              <tbody>
                {accessRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <h3>Nenhuma solicitação encontrada</h3>
                        <p>Todas as solicitações de acesso foram processadas.</p>
                      </div>
                    </td>
                  </tr>
                ) : accessRequests.map(req => (
                  <tr key={req.id}>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {new Date(req.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ fontWeight: 600 }}>{req.email}</td>
                    <td>{req.name || '-'}</td>
                    <td><span className={`badge ${ROLE_MAP[req.role || 'TI']}`}>{ROLE_LABELS[req.role || 'TI']}</span></td>
                    <td>
                      <span className={`badge ${req.status === 'APPROVED' ? 'badge-confirmed' : req.status === 'PENDING' ? 'badge-pending' : 'badge-cancelled'}`}>
                        {req.status === 'APPROVED' ? 'Aprovado' : req.status === 'PENDING' ? 'Pendente' : 'Recusado'}
                      </span>
                    </td>
                    <td>
                      {req.status === 'PENDING' ? (
                        <div className="flex gap-8">
                          <button className="btn btn-success btn-sm" onClick={() => approveRequest(req.id)}>
                            <IconCheck /> Autorizar E-mail
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => rejectRequest(req.id)}>
                            <IconCross /> Recusar
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Processado em {req.processed_at ? new Date(req.processed_at).toLocaleDateString('pt-BR') : '-'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Novo Usuário</h2>
              <button className="modal-close" onClick={() => setModal(null)}><IconCross /></button>
            </div>
            <form onSubmit={createUser}>
              <div className="form-group"><label className="form-label">Nome Completo *</label><input className="form-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">E-mail Corporativo *</label><input type="email" className="form-input" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Senha *</label><input type="password" className="form-input" required minLength={8} value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
              <div className="form-group">
                <label className="form-label">Perfil de Acesso *</label>
                <select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="TI">TI</option>
                  <option value="PATRIMONIO">Patrimônio</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar Conta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'email' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Autorizar E-mail</h2>
              <button className="modal-close" onClick={() => setModal(null)}><IconCross /></button>
            </div>
            <form onSubmit={addEmail}>
              <div className="form-group"><label className="form-label">E-mail *</label><input type="email" className="form-input" required value={emailForm.email} onChange={e => setEmailForm({...emailForm, email: e.target.value})} placeholder="colaborador@farmarcas.com.br" /></div>
              <div className="form-group"><label className="form-label">Nome do Colaborador</label><input className="form-input" value={emailForm.name} onChange={e => setEmailForm({...emailForm, name: e.target.value})} /></div>
              <div className="form-group">
                <label className="form-label">Perfil Autorizado *</label>
                <select className="form-select" value={emailForm.role} onChange={e => setEmailForm({...emailForm, role: e.target.value})}>
                  <option value="TI">TI</option>
                  <option value="PATRIMONIO">Patrimônio</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Autorização</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'reset' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Redefinir Senha de Usuário</h2>
              <button className="modal-close" onClick={() => setModal(null)}><IconCross /></button>
            </div>
            <form onSubmit={resetPassword}>
              <div className="form-group"><label className="form-label">Nova Senha *</label><input type="password" className="form-input" required minLength={8} value={resetForm.newPassword} onChange={e => setResetForm({...resetForm, newPassword: e.target.value})} placeholder="Mínimo 8 caracteres" /></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-danger">Confirmar Nova Senha</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
