import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { IconCheck, IconCross, IconAlert, IconPlus } from '../components/Icons';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);
  const [customQuantities, setCustomQuantities] = useState({});
  const [toast, setToast] = useState(null);

  // Modal State
  const [selectedItemModal, setSelectedItemModal] = useState(null);
  const [orderQty, setOrderQty] = useState(1);
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    try {
      const [itemsRes, ordersRes] = await Promise.all([
        api.get('/stock'),
        api.get('/purchase-orders?status=PENDING'),
      ]);
      setItems(itemsRes.data);
      setOrders(ordersRes.data);

      const initialQtys = {};
      ordersRes.data.forEach(o => {
        initialQtys[o.id] = o.predicted_quantity;
      });
      setCustomQuantities(initialQtys);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const [filterStatus, setFilterStatus] = useState('ALL');

  const handleQtyChange = (orderId, val) => {
    setCustomQuantities(prev => ({ ...prev, [orderId]: val }));
  };

  const confirmOrder = async (orderId) => {
    setConfirmingId(orderId);
    const qty = parseInt(customQuantities[orderId]) || 1;
    try {
      const { data } = await api.put(`/purchase-orders/${orderId}/confirm`, { quantity: qty });
      const bxTask = data.bitrix24Task || data.jiraTask;
      showToast(bxTask ? `Pedido confirmado! Chamado Bitrix24: #${bxTask.id}` : 'Pedido confirmado com sucesso!');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao confirmar pedido', 'error');
    } finally { setConfirmingId(null); }
  };

  const cancelOrder = async (orderId) => {
    try {
      await api.put(`/purchase-orders/${orderId}/cancel`);
      showToast('Pedido cancelado');
      load();
    } catch {}
  };

  const openOrderModal = (item) => {
    const defaultQty = Math.max(item.minimum_quantity - item.current_quantity, 1);
    setSelectedItemModal(item);
    setOrderQty(defaultQty);
    setOrderNotes('');
  };

  const handleCreateOrder = async (confirmImmediately) => {
    if (!selectedItemModal) return;
    setSubmittingOrder(true);
    try {
      const { data } = await api.post('/purchase-orders', {
        item_id: selectedItemModal.id,
        quantity: parseInt(orderQty) || 1,
        predicted_quantity: parseInt(orderQty) || 1,
        confirm_immediately: confirmImmediately,
        notes: orderNotes,
      });

      if (confirmImmediately) {
        const bxTask = data.bitrix24Task;
        showToast(bxTask ? `Pedido confirmado com sucesso! Chamado Bitrix24 enviado: #${bxTask.id}` : 'Pedido confirmado e enviado ao Bitrix24!');
      } else {
        showToast('Pedido adicionado aos Pedidos Pendentes com sucesso!');
      }

      setSelectedItemModal(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao realizar pedido', 'error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner"></div><span>Carregando...</span></div>;

  const critical = items.filter(i => i.status === 'CRITICAL');
  const alert = items.filter(i => i.status === 'ALERT');
  const normal = items.filter(i => i.status === 'NORMAL');

  const displayedItems = items.filter(item => {
    if (filterStatus === 'ALL') return true;
    return item.status === filterStatus;
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
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visão geral do estoque em tempo real · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      <div className="grid-4 mb-24">
        <div
          className="stat-card"
          onClick={() => setFilterStatus('ALL')}
          style={{
            cursor: 'pointer',
            borderColor: filterStatus === 'ALL' ? 'var(--orange)' : undefined,
            boxShadow: filterStatus === 'ALL' ? '0 0 16px rgba(255,107,0,0.3)' : undefined
          }}
        >
          <div className="value" style={{ color: 'var(--text-primary)' }}>{items.length}</div>
          <div className="label">Total de Itens</div>
        </div>
        <div
          className="stat-card green"
          onClick={() => setFilterStatus('NORMAL')}
          style={{
            cursor: 'pointer',
            borderColor: filterStatus === 'NORMAL' ? 'var(--status-normal)' : undefined,
            boxShadow: filterStatus === 'NORMAL' ? '0 0 16px rgba(34,197,94,0.3)' : undefined
          }}
        >
          <div className="value">{normal.length}</div>
          <div className="label">Status Normal</div>
        </div>
        <div
          className="stat-card yellow"
          onClick={() => setFilterStatus('ALERT')}
          style={{
            cursor: 'pointer',
            borderColor: filterStatus === 'ALERT' ? 'var(--orange)' : undefined,
            boxShadow: filterStatus === 'ALERT' ? '0 0 16px rgba(255,107,0,0.3)' : undefined
          }}
        >
          <div className="value">{alert.length}</div>
          <div className="label">Em Alerta</div>
        </div>
        <div
          className="stat-card red"
          onClick={() => setFilterStatus('CRITICAL')}
          style={{
            cursor: 'pointer',
            borderColor: filterStatus === 'CRITICAL' ? 'var(--status-critical)' : undefined,
            boxShadow: filterStatus === 'CRITICAL' ? '0 0 16px rgba(239,68,68,0.3)' : undefined
          }}
        >
          <div className="value">{critical.length}</div>
          <div className="label">Crítico</div>
        </div>
      </div>

      {orders.length > 0 && can('ADMIN', 'TI') && (
        <div className="card mb-24" style={{ borderColor: 'rgba(255,107,0,0.3)', background: 'linear-gradient(135deg, var(--bg-card), #150900)' }}>
          <div className="section-header">
            <div>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconAlert color="var(--orange)" /> Pedidos de Compra Pendentes (A Serem Feitos)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                Você pode ajustar a quantidade a ser pedida antes de confirmar a abertura do pedido no Bitrix24
              </div>
            </div>
            <span className="badge badge-pending">{orders.length} pendente{orders.length > 1 ? 's' : ''}</span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qtd Atual</th>
                  <th>Mínimo</th>
                  <th>Qtd a Pedir</th>
                  <th>Média/Dia</th>
                  <th>Cobertura</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.item_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.category}</div>
                    </td>
                    <td>
                      <span style={{ color: o.current_quantity <= 0 ? 'var(--status-critical)' : 'var(--status-alert)', fontWeight: 700 }}>
                        {o.current_quantity}
                      </span>
                    </td>
                    <td>{o.minimum_quantity}</td>
                    <td>
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
                    </td>
                    <td>{Number(o.daily_average || 0).toFixed(2)}/dia</td>
                    <td>{o.coverage_days} dias</td>
                    <td>
                      <div className="flex gap-8">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => confirmOrder(o.id)}
                          disabled={confirmingId === o.id}
                        >
                          {confirmingId === o.id ? <div className="spinner" style={{width:14,height:14}}></div> : <IconCheck />} Confirmar
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => cancelOrder(o.id)}>
                          <IconCross /> Cancelar
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

      <div className="card">
        <div className="section-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="section-title">
            Status do Estoque
            {filterStatus !== 'ALL' && (
              <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 12, color: 'var(--orange)' }}>
                (Filtrando: {filterStatus === 'CRITICAL' ? 'Crítico' : filterStatus === 'ALERT' ? 'Em Alerta' : 'Normal'})
              </span>
            )}
          </div>
          {filterStatus !== 'ALL' && (
            <button className="btn btn-secondary btn-sm" onClick={() => setFilterStatus('ALL')}>
              Mostrar Todos os Itens ({items.length})
            </button>
          )}
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Categoria</th>
                <th>Quantidade</th>
                <th>Mínimo</th>
                <th>Status</th>
                <th>Progresso</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <h3>Nenhum item com este status</h3>
                    </div>
                  </td>
                </tr>
              ) : displayedItems.map(item => {
                const pct = item.minimum_quantity > 0
                  ? Math.min((item.current_quantity / (item.minimum_quantity * 3)) * 100, 100)
                  : 100;
                const cls = item.status === 'CRITICAL' ? 'critical' : item.status === 'ALERT' ? 'alert' : 'normal';
                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.unit}</div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.category}</td>
                    <td>
                      <span style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: item.status === 'CRITICAL' ? 'var(--status-critical)' : item.status === 'ALERT' ? 'var(--orange)' : 'var(--status-normal)'
                      }}>
                        {item.current_quantity}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.minimum_quantity}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div className="progress-bar">
                        <div className={`progress-fill ${cls}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{Math.round(pct)}% do objetivo</div>
                    </td>
                    <td>
                      {can('ADMIN', 'TI') && (
                        <button
                          className={`btn btn-sm ${item.status === 'CRITICAL' ? 'btn-danger' : item.status === 'ALERT' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => openOrderModal(item)}
                        >
                          <IconPlus size={14} /> Realizar Pedido
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedItemModal && (
        <div className="modal-overlay" onClick={() => setSelectedItemModal(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Confirmar Realização do Pedido</h2>
              <button className="modal-close" onClick={() => setSelectedItemModal(null)}><IconCross /></button>
            </div>

            <div style={{ background: 'var(--bg-dark)', padding: 16, borderRadius: 10, marginBottom: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--orange)' }}>{selectedItemModal.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Categoria: {selectedItemModal.category}</div>
              <div className="flex gap-16" style={{ marginTop: 12, fontSize: 13 }}>
                <div>Estoque Atual: <strong style={{ color: selectedItemModal.current_quantity <= selectedItemModal.minimum_quantity ? 'var(--orange)' : 'inherit' }}>{selectedItemModal.current_quantity} {selectedItemModal.unit}</strong></div>
                <div>Estoque Mínimo: <strong>{selectedItemModal.minimum_quantity} {selectedItemModal.unit}</strong></div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Quantidade a Pedir *</label>
              <input
                type="number"
                min="1"
                className="form-input"
                style={{ fontWeight: 700, fontSize: 15 }}
                value={orderQty}
                onChange={e => setOrderQty(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observações para o Bitrix24</label>
              <input
                className="form-input"
                placeholder="Ex: Reposição de emergência via solicitação no Dashboard"
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
              />
            </div>

            <div style={{ background: 'var(--orange-glow)', padding: '10px 14px', borderRadius: 8, fontSize: 12, border: '1px solid rgba(255, 107, 0, 0.3)', color: '#fff', marginBottom: 16 }}>
              ⚡ <strong>Ação de Automação:</strong> Ao confirmar, o chamado de compras será aberto imediatamente no <strong>Bitrix24</strong> e o pedido será registrado como <strong>Confirmado</strong>.
            </div>

            <div className="modal-footer" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedItemModal(null)}>Cancelar</button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={submittingOrder}
                onClick={() => handleCreateOrder(false)}
              >
                Salvar como Pendente
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontWeight: 700 }}
                disabled={submittingOrder}
                onClick={() => handleCreateOrder(true)}
              >
                {submittingOrder ? <div className="spinner" style={{width:16,height:16}}></div> : '🚀 Confirmar e Enviar ao Bitrix24'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
