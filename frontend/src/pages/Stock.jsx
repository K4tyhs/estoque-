import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { IconPlus, IconEdit, IconTrash, IconCheck, IconCross, IconAlert } from '../components/Icons';

export default function Stock() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modal, setModal] = useState(null); // 'create' | 'edit' | 'move' | 'order'
  const [selectedItem, setSelectedItem] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'Periféricos', unit: 'unidade', current_quantity: 0, minimum_quantity: 5, notes: '' });
  const [moveForm, setMoveForm] = useState({ type: 'OUT', quantity: 1, notes: '' });
  const [toast, setToast] = useState(null);

  // Order modal state
  const [orderQty, setOrderQty] = useState(1);
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    try {
      const { data } = await api.get('/stock');
      setItems(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        current_quantity: parseInt(form.current_quantity) || 0,
        minimum_quantity: parseInt(form.minimum_quantity) || 1,
      };
      await api.post('/stock', payload);
      showToast('Item criado com sucesso!');
      setModal(null); load();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao criar item', 'error'); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        minimum_quantity: parseInt(form.minimum_quantity) || 1,
      };
      await api.put(`/stock/${form.id}`, payload);
      showToast('Item atualizado com sucesso!');
      setModal(null); load();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao atualizar item', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja remover este item?')) return;
    try {
      await api.delete(`/stock/${id}`);
      showToast('Item removido com sucesso');
      load();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao remover item', 'error'); }
  };

  const handleMove = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...moveForm,
        quantity: parseInt(moveForm.quantity) || 1,
      };
      await api.post(`/stock/${selectedItem.id}/move`, payload);
      showToast('Movimentação registrada com sucesso!');
      setModal(null); load();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao registrar movimentação', 'error'); }
  };

  const openOrderModal = (item) => {
    const defaultQty = Math.max(item.minimum_quantity - item.current_quantity, 1);
    setSelectedItem(item);
    setOrderQty(defaultQty);
    setOrderNotes('');
    setModal('order');
  };

  const handleCreateOrder = async (confirmImmediately) => {
    if (!selectedItem) return;
    setSubmittingOrder(true);
    try {
      const { data } = await api.post('/purchase-orders', {
        item_id: selectedItem.id,
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

      setModal(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao realizar pedido', 'error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner"></div><span>Carregando estoque...</span></div>;

  const categories = ['ALL', ...new Set(items.map(i => i.category))];

  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || i.category === categoryFilter;
    const matchStat = statusFilter === 'ALL' || i.status === statusFilter;
    return matchSearch && matchCat && matchStat;
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
            <h1 className="page-title">Gestão de Estoque</h1>
            <p className="page-subtitle">Cadastro de itens, ajuste de estoque mínimo e movimentações manuais</p>
          </div>

          {can('ADMIN', 'TI') && (
            <button className="btn btn-primary" onClick={() => {
              setForm({ name: '', category: 'Periféricos', unit: 'unidade', current_quantity: 0, minimum_quantity: 5, notes: '' });
              setModal('create');
            }}>
              <IconPlus /> Novo Item
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-24" style={{ gap: 16, flexWrap: 'wrap' }}>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 260 }}>
            <input
              className="form-input"
              placeholder="Buscar item no estoque..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className="form-select" style={{ width: 160 }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c === 'ALL' ? 'Todas Categorias' : c}</option>)}
          </select>

          <select className="form-select" style={{ width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">Todos Status</option>
            <option value="NORMAL">Normal</option>
            <option value="ALERT">Em Alerta</option>
            <option value="CRITICAL">Crítico</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Categoria</th>
                <th>Qtd. Atual</th>
                <th>Qtd. Mínima</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <h3>Nenhum item encontrado</h3>
                      <p>Tente ajustar os filtros de busca.</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.unit}</div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{item.category}</td>
                  <td>
                    <span style={{
                      fontSize: 16,
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
                  <td>
                    <div className="flex gap-8">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedItem(item);
                          setMoveForm({ type: 'OUT', quantity: 1, notes: '' });
                          setModal('move');
                        }}
                      >
                        Movimentar
                      </button>

                      {can('ADMIN', 'TI') && (
                        <>
                          <button
                            className={`btn btn-sm ${item.status === 'CRITICAL' ? 'btn-danger' : item.status === 'ALERT' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => openOrderModal(item)}
                            title="Fazer Pedido de Compra"
                          >
                            <IconPlus size={14} /> Pedido
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setForm({
                                id: item.id,
                                name: item.name,
                                category: item.category,
                                unit: item.unit,
                                minimum_quantity: item.minimum_quantity,
                                notes: item.notes || ''
                              });
                              setModal('edit');
                            }}
                          >
                            <IconEdit />
                          </button>
                          {can('ADMIN') && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>
                              <IconTrash />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'order' && selectedItem && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Confirmar Realização do Pedido</h2>
              <button className="modal-close" onClick={() => setModal(null)}><IconCross /></button>
            </div>

            <div style={{ background: 'var(--bg-dark)', padding: 16, borderRadius: 10, marginBottom: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--orange)' }}>{selectedItem.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Categoria: {selectedItem.category}</div>
              <div className="flex gap-16" style={{ marginTop: 12, fontSize: 13 }}>
                <div>Estoque Atual: <strong style={{ color: selectedItem.current_quantity <= selectedItem.minimum_quantity ? 'var(--orange)' : 'inherit' }}>{selectedItem.current_quantity} {selectedItem.unit}</strong></div>
                <div>Estoque Mínimo: <strong>{selectedItem.minimum_quantity} {selectedItem.unit}</strong></div>
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
                placeholder="Ex: Reposição de emergência solicitada via Estoque"
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
              />
            </div>

            <div style={{ background: 'var(--orange-glow)', padding: '10px 14px', borderRadius: 8, fontSize: 12, border: '1px solid rgba(255, 107, 0, 0.3)', color: '#fff', marginBottom: 16 }}>
              ⚡ <strong>Ação de Automação:</strong> Ao confirmar, o chamado de compras será aberto imediatamente no <strong>Bitrix24</strong> e o pedido será registrado como <strong>Confirmado</strong>.
            </div>

            <div className="modal-footer" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
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

      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Novo Item no Estoque</h2>
              <button className="modal-close" onClick={() => setModal(null)}><IconCross /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Nome do Item *</label>
                <input className="form-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Teclado USB Dell" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Categoria *</label>
                  <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="Periféricos">Periféricos</option>
                    <option value="Cabos e Adaptadores">Cabos e Adaptadores</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Redes">Redes</option>
                    <option value="Escritório">Escritório</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unidade</label>
                  <input className="form-input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="unidade" />
                </div>
                <div className="form-group">
                  <label className="form-label">Qtd. Inicial</label>
                  <input className="form-input" type="number" min="0" value={form.current_quantity} onChange={e => setForm({...form, current_quantity: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Qtd. Mínima</label>
                  <input className="form-input" type="number" min="1" value={form.minimum_quantity} onChange={e => setForm({...form, minimum_quantity: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'edit' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Editar Item: {form.name}</h2>
              <button className="modal-close" onClick={() => setModal(null)}><IconCross /></button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label className="form-label">Nome do Item *</label>
                <input className="form-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Categoria *</label>
                  <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="Periféricos">Periféricos</option>
                    <option value="Cabos e Adaptadores">Cabos e Adaptadores</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Redes">Redes</option>
                    <option value="Escritório">Escritório</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unidade</label>
                  <input className="form-input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Qtd. Mínima *</label>
                  <input className="form-input" type="number" min="1" required value={form.minimum_quantity} onChange={e => setForm({...form, minimum_quantity: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'move' && selectedItem && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Movimentar Estoque: {selectedItem.name}</h2>
              <button className="modal-close" onClick={() => setModal(null)}><IconCross /></button>
            </div>
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              Quantidade Atual: <strong>{selectedItem.current_quantity} {selectedItem.unit}</strong> (Mínimo: {selectedItem.minimum_quantity})
            </div>
            <form onSubmit={handleMove}>
              <div className="form-group">
                <label className="form-label">Tipo de Movimentação</label>
                <div className="grid-2">
                  <button type="button" className={`btn ${moveForm.type === 'OUT' ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setMoveForm({...moveForm, type: 'OUT'})}>
                    Saída (Retirar)
                  </button>
                  <button type="button" className={`btn ${moveForm.type === 'IN' ? 'btn-success' : 'btn-secondary'}`} onClick={() => setMoveForm({...moveForm, type: 'IN'})}>
                    Entrada de Estoque
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Quantidade</label>
                <input className="form-input" type="number" min="1" value={moveForm.quantity} onChange={e => setMoveForm({...moveForm, quantity: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Observações / Solicitante</label>
                <input className="form-input" value={moveForm.notes} onChange={e => setMoveForm({...moveForm, notes: e.target.value})} placeholder="Motivo ou número do chamado..." />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className={`btn ${moveForm.type === 'IN' ? 'btn-success' : 'btn-danger'}`}>
                  Confirmar {moveForm.type === 'IN' ? 'Entrada' : 'Saída'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
