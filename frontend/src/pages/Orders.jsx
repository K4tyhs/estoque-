import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { IconCheck, IconCross, IconExternalLink, IconAlert, IconSearch, IconPlus } from '../components/Icons';

export default function Orders() {
  const { can } = useAuth();
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('PENDING'); // 'PENDING' | 'CONFIRMED' | 'ALL'
  const [customQuantities, setCustomQuantities] = useState({});
  const [confirmingId, setConfirmingId] = useState(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create'
  const [orderForm, setOrderForm] = useState({ item_id: '', quantity: 1, confirm_immediately: false, notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    try {
      const [ordersRes, itemsRes] = await Promise.all([
        api.get('/purchase-orders?status=ALL'),
        api.get('/stock'),
      ]);
      setOrders(ordersRes.data);
      setItems(itemsRes.data);

      const qtys = {};
      ordersRes.data.forEach(o => {
        if (o.status === 'PENDING') {
          qtys[o.id] = o.predicted_quantity;
        }
      });
      setCustomQuantities(qtys);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleQtyChange = (orderId, val) => {
    const qty = parseInt(val) || 1;
    setCustomQuantities(prev => ({ ...prev, [orderId]: qty }));
  };

  const confirmOrder = async (orderId) => {
    setConfirmingId(orderId);
    const qty = customQuantities[orderId];
    try {
      const { data } = await api.put(`/purchase-orders/${orderId}/confirm`, { quantity: qty });
      showToast(data.jiraTask ? `Pedido confirmado! Tarefa JIRA: ${data.jiraTask.id}` : 'Pedido confirmado com sucesso!');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao confirmar pedido', 'error');
    } finally { setConfirmingId(null); }
  };

  const cancelOrder = async (orderId) => {
    if (!confirm('Deseja realmente cancelar este pedido de compra?')) return;
    try {
      await api.put(`/purchase-orders/${orderId}/cancel`);
      showToast('Pedido cancelado');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao cancelar pedido', 'error');
    }
  };

  const handleCreateManualOrder = async (e) => {
    e.preventDefault();
    if (!orderForm.item_id || orderForm.quantity <= 0) {
      return showToast('Selecione um item e informe uma quantidade válida', 'error');
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/purchase-orders', orderForm);
      showToast(data.message || 'Pedido manual criado com sucesso!');
      setModal(null);
      setOrderForm({ item_id: '', quantity: 1, confirm_immediately: false, notes: '' });
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao criar pedido manual', 'error');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner"></div><span>Carregando pedidos...</span></div>;

  const pendingCount = orders.filter(o => o.status === 'PENDING').length;
  const confirmedCount = orders.filter(o => o.status === 'CONFIRMED').length;

  const filtered = orders.filter(o => {
    const matchStatus = tab === 'ALL' || o.status === tab;
    const matchSearch = o.item_name.toLowerCase().includes(search.toLowerCase()) ||
                        (o.category && o.category.toLowerCase().includes(search.toLowerCase())) ||
                        (o.jira_task_id && o.jira_task_id.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

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
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title">Pedidos de Compra</h1>
            <p className="page-subtitle">Acompanhe pedidos a serem feitos, crie pedidos manuais e consulte o histórico de compras</p>
          </div>

          {can('ADMIN', 'TI') && (
            <button className="btn btn-primary" onClick={() => setModal('create')}>
              <IconPlus /> Novo Pedido Manual
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-24" style={{ gap: 16, flexWrap: 'wrap' }}>
        <div className="flex gap-8">
          <button
            className={`btn ${tab === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('PENDING')}
          >
            A Serem Feitos ({pendingCount})
          </button>
          <button
            className={`btn ${tab === 'CONFIRMED' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('CONFIRMED')}
          >
            Pedidos Realizados ({confirmedCount})
          </button>
          <button
            className={`btn ${tab === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('ALL')}
          >
            Todos ({orders.length})
          </button>
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <input
            className="form-input"
            placeholder="Buscar pedido ou item..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <IconSearch size={16} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Item</th>
                <th>Estoque Atual</th>
                <th>Qtd. a Pedir</th>
                <th>Status</th>
                <th>Confirmado Por</th>
                <th>Tarefa JIRA</th>
                {can('ADMIN', 'TI') && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <h3>Nenhum pedido encontrado</h3>
                      <p>Não há registros correspondentes ao filtro selecionado.</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(o => (
                <tr key={o.id}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: 12 }}>
                    {new Date(o.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.item_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.category}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: o.current_quantity <= o.minimum_quantity ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                      {o.current_quantity} {o.unit}
                    </span>
                  </td>
                  <td>
                    {o.status === 'PENDING' && can('ADMIN', 'TI') ? (
                      <div className="flex items-center gap-8">
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          style={{ width: 80, padding: '4px 8px', fontWeight: 700, color: 'var(--orange)', textAlign: 'center' }}
                          value={customQuantities[o.id] ?? o.predicted_quantity}
                          onChange={e => handleQtyChange(o.id, e.target.value)}
                        />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.unit}</span>
                      </div>
                    ) : (
                      <strong style={{ color: 'var(--orange)', fontSize: 15 }}>{o.predicted_quantity} {o.unit}</strong>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${o.status === 'CONFIRMED' ? 'badge-confirmed' : o.status === 'PENDING' ? 'badge-pending' : 'badge-cancelled'}`}>
                      {o.status === 'CONFIRMED' ? 'Realizado' : o.status === 'PENDING' ? 'Pendente' : 'Cancelado'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {o.confirmed_by_name || '-'}
                  </td>
                  <td>
                    {o.jira_task_id ? (
                      <a
                        href={o.jira_task_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="badge badge-jira"
                        style={{ textDecoration: 'none', gap: 4 }}
                      >
                        {o.jira_task_id} <IconExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  {can('ADMIN', 'TI') && (
                    <td>
                      {o.status === 'PENDING' ? (
                        <div className="flex gap-8">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => confirmOrder(o.id)}
                            disabled={confirmingId === o.id}
                          >
                            {confirmingId === o.id ? <div className="spinner" style={{width:14,height:14}}></div> : <IconCheck />} Confirmar
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => cancelOrder(o.id)}>
                            <IconCross />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Concluído</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Novo Pedido de Compra Manual</h2>
              <button className="modal-close" onClick={() => setModal(null)}><IconCross /></button>
            </div>
            <form onSubmit={handleCreateManualOrder}>
              <div className="form-group">
                <label className="form-label">Item de Estoque *</label>
                <select
                  className="form-select"
                  required
                  value={orderForm.item_id}
                  onChange={e => setOrderForm({ ...orderForm, item_id: e.target.value })}
                >
                  <option value="">Selecione o item para pedido...</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Categoria: {i.category} | Estoque Atual: {i.current_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quantidade a Pedir *</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  required
                  value={orderForm.quantity}
                  onChange={e => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observações / Justificativa</label>
                <input
                  className="form-input"
                  value={orderForm.notes}
                  onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                  placeholder="Ex: Demanda urgente para novo colaborador"
                />
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label style={{ display: 'flex', itemsCenter: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={orderForm.confirm_immediately}
                    onChange={e => setOrderForm({ ...orderForm, confirm_immediately: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: 'var(--orange)' }}
                  />
                  <strong>Confirmar e criar tarefa no JIRA imediatamente</strong>
                </label>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, marginLeft: 26 }}>
                  Se desmarcado, o pedido será criado na fila de "A Serem Feitos (Pendentes)" para confirmação posterior.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><div className="spinner" style={{width:14,height:14}}></div> Processando...</> : 'Criar Pedido de Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
