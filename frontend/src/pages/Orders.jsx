import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { IconPlus, IconCheck, IconCross, IconAlert } from '../components/Icons';

export default function Orders() {
  const { user, can } = useAuth();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('PENDING'); // 'PENDING' | 'CONFIRMED' | 'ALL'
  const [search, setSearch] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [customQuantities, setCustomQuantities] = useState({});
  const [modal, setModal] = useState(null); // 'create'
  const [manualForm, setManualForm] = useState({ item_id: '', predicted_quantity: 1, notes: '' });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    try {
      const [ordersRes, stockRes] = await Promise.all([
        api.get('/purchase-orders'),
        api.get('/stock'),
      ]);
      setOrders(ordersRes.data);
      setStockItems(stockRes.data);

      const qtys = {};
      ordersRes.data.forEach(o => {
        if (o.status === 'PENDING') {
          qtys[o.id] = o.predicted_quantity;
        }
      });
      setCustomQuantities(qtys);

      // If URL has ?newOrder=itemId or ?item=itemId, automatically open creation modal
      const queryItemId = searchParams.get('item') || searchParams.get('newOrder');
      if (queryItemId) {
        const itemObj = stockRes.data.find(i => String(i.id) === String(queryItemId));
        const defaultQty = itemObj ? Math.max(itemObj.minimum_quantity - itemObj.current_quantity, 1) : 1;
        setManualForm({ item_id: queryItemId, predicted_quantity: defaultQty, notes: '' });
        setModal('create');
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [searchParams]);

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
      setTab('CONFIRMED');
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

  const handleCreateManualOrder = async (e, sendToBitrix = true) => {
    if (e) e.preventDefault();
    if (!manualForm.item_id) return showToast('Selecione um item do estoque', 'error');
    try {
      const { data } = await api.post('/purchase-orders', {
        item_id: parseInt(manualForm.item_id),
        quantity: parseInt(manualForm.predicted_quantity) || 1,
        predicted_quantity: parseInt(manualForm.predicted_quantity) || 1,
        confirm_immediately: sendToBitrix,
        notes: manualForm.notes,
      });

      if (sendToBitrix) {
        const bxTask = data.bitrix24Task;
        showToast(bxTask ? `Pedido confirmado! Chamado Bitrix24 enviado: #${bxTask.id}` : 'Pedido confirmado e enviado ao Bitrix24!');
        setTab('CONFIRMED');
      } else {
        showToast('Pedido de compra registrado como PENDENTE com sucesso!');
        setTab('PENDING');
      }

      setModal(null);
      setManualForm({ item_id: '', predicted_quantity: 1, notes: '' });
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao criar pedido manual', 'error');
    }
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

  const selectedItemObj = stockItems.find(i => String(i.id) === String(manualForm.item_id));

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
            <h1 className="page-title">Pedidos de Compra (Bitrix24)</h1>
            <p className="page-subtitle">Acompanhe solicitações a serem feitas, confirme dados e autorize o envio de chamados ao Bitrix24</p>
          </div>

          {can('ADMIN', 'TI') && (
            <button className="btn btn-primary" onClick={() => setModal('create')}>
              <IconPlus /> Novo Pedido de Compra
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
          />
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Item</th>
                <th>Status Item</th>
                <th>Qtd a Pedir</th>
                <th>Status Pedido</th>
                <th>Chamado Bitrix24</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <h3>Nenhum pedido encontrado</h3>
                      <p>Não há pedidos de compra com os filtros selecionados.</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(o => (
                <tr key={o.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {new Date(o.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.item_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.category}</div>
                  </td>
                  <td>
                    <StatusBadge status={o.item_status} />
                  </td>
                  <td>
                    {o.status === 'PENDING' ? (
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
                      <span style={{ fontWeight: 700 }}>{o.confirmed_quantity || o.predicted_quantity} {o.unit}</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${o.status === 'CONFIRMED' ? 'badge-confirmed' : o.status === 'PENDING' ? 'badge-pending' : 'badge-cancelled'}`}>
                      {o.status === 'CONFIRMED' ? 'Enviado ao Bitrix24' : o.status === 'PENDING' ? 'Pendente' : 'Cancelado'}
                    </span>
                  </td>
                  <td>
                    {o.jira_task_id ? (
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)' }}>
                        Chamado #{o.jira_task_id}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td>
                    {o.status === 'PENDING' && can('ADMIN', 'TI') ? (
                      <div className="flex gap-8">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => confirmOrder(o.id)}
                          disabled={confirmingId === o.id}
                        >
                          {confirmingId === o.id ? <div className="spinner" style={{width:14,height:14}}></div> : <IconCheck />} Confirmar e Enviar ao Bitrix
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => cancelOrder(o.id)}>
                          <IconCross /> Cancelar
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Concluído</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Confirmar Solicitacão de Pedido de Compra</h2>
              <button className="modal-close" onClick={() => setModal(null)}><IconCross /></button>
            </div>

            {selectedItemObj && (
              <div style={{ background: 'var(--bg-dark)', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--orange)' }}>{selectedItemObj.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Categoria: {selectedItemObj.category}</div>
                <div className="flex gap-16" style={{ marginTop: 10, fontSize: 13 }}>
                  <div>Estoque Atual: <strong style={{ color: selectedItemObj.current_quantity <= selectedItemObj.minimum_quantity ? 'var(--orange)' : 'inherit' }}>{selectedItemObj.current_quantity} {selectedItemObj.unit}</strong></div>
                  <div>Mínimo: <strong>{selectedItemObj.minimum_quantity} {selectedItemObj.unit}</strong></div>
                </div>
              </div>
            )}

            <form onSubmit={(e) => handleCreateManualOrder(e, true)}>
              <div className="form-group">
                <label className="form-label">Item do Estoque *</label>
                <select
                  className="form-select"
                  required
                  value={manualForm.item_id}
                  onChange={e => {
                    const id = e.target.value;
                    const itemObj = stockItems.find(i => String(i.id) === String(id));
                    const defaultQty = itemObj ? Math.max(itemObj.minimum_quantity - itemObj.current_quantity, 1) : 1;
                    setManualForm({ ...manualForm, item_id: id, predicted_quantity: defaultQty });
                  }}
                >
                  <option value="">Selecione um item...</option>
                  {stockItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.category}) — Qtd Atual: {item.current_quantity} (Mín: {item.minimum_quantity})
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
                  value={manualForm.predicted_quantity}
                  onChange={e => setManualForm({...manualForm, predicted_quantity: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observações / Detalhes para o Bitrix24</label>
                <input
                  className="form-input"
                  placeholder="Ex: Pedido emergencial para reposição de TI"
                  value={manualForm.notes}
                  onChange={e => setManualForm({...manualForm, notes: e.target.value})}
                />
              </div>

              <div style={{ background: 'var(--orange-glow)', padding: '10px 14px', borderRadius: 8, fontSize: 12, border: '1px solid rgba(255, 107, 0, 0.3)', color: '#fff', marginBottom: 16 }}>
                ⚡ <strong>Ação Bitrix24:</strong> Ao clicar em confirmar, as informações acima serão validadas e o chamado de reposição de compras será aberto imediatamente no <strong>Bitrix24</strong>.
              </div>

              <div className="modal-footer" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="button" className="btn btn-secondary" onClick={(e) => handleCreateManualOrder(e, false)}>Salvar como Pendente</button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                  🚀 Confirmar e Enviar ao Bitrix24
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
