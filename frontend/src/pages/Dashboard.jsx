import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { IconCheck, IconCross, IconAlert, IconEdit } from '../components/Icons';

export default function Dashboard() {
  const { user, can } = useAuth();
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);
  const [editingQtyId, setEditingQtyId] = useState(null);
  const [customQuantities, setCustomQuantities] = useState({});
  const [toast, setToast] = useState(null);

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

  const handleQtyChange = (orderId, val) => {
    const qty = parseInt(val) || 1;
    setCustomQuantities(prev => ({ ...prev, [orderId]: qty }));
  };

  const saveQuantity = async (orderId) => {
    const qty = customQuantities[orderId];
    try {
      await api.put(`/purchase-orders/${orderId}/quantity`, { quantity: qty });
      showToast('Quantidade do pedido atualizada');
      setEditingQtyId(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao atualizar quantidade', 'error');
    }
  };

  const confirmOrder = async (orderId) => {
    setConfirmingId(orderId);
    const qty = customQuantities[orderId];
    try {
      const { data } = await api.put(`/purchase-orders/${orderId}/confirm`, { quantity: qty });
      showToast(data.jiraTask ? `Pedido confirmado! Tarefa JIRA criada: ${data.jiraTask.id}` : 'Pedido confirmado com sucesso!');
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

  if (loading) return <div className="loading-center"><div className="spinner"></div><span>Carregando...</span></div>;

  const critical = items.filter(i => i.status === 'CRITICAL');
  const alert = items.filter(i => i.status === 'ALERT');
  const normal = items.filter(i => i.status === 'NORMAL');

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
        <div className="stat-card">
          <div className="value" style={{ color: 'var(--text-primary)' }}>{items.length}</div>
          <div className="label">Total de Itens</div>
        </div>
        <div className="stat-card green">
          <div className="value">{normal.length}</div>
          <div className="label">Status Normal</div>
        </div>
        <div className="stat-card yellow">
          <div className="value">{alert.length}</div>
          <div className="label">Em Alerta</div>
        </div>
        <div className="stat-card red">
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
                Você pode ajustar a quantidade a ser pedida antes de confirmar o disparo da ordem no JIRA
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
        <div className="section-header">
          <div className="section-title">Status do Estoque</div>
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
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
