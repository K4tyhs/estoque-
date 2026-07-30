import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { IconPlus, IconEdit, IconTrash, IconArrowUpDown, IconSearch, IconCheck, IconCross, IconAlert } from '../components/Icons';

export default function Stock() {
  const { can } = useAuth();
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('items');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [moveForm, setMoveForm] = useState({ type: 'OUT', quantity: 1, notes: '' });
  const [selectedItem, setSelectedItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    try {
      const [ir, mr] = await Promise.all([api.get('/stock'), api.get('/stock/movements?limit=100')]);
      setItems(ir.data);
      setMovements(mr.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ name: '', category: '', description: '', unit: 'unidade', current_quantity: 0, minimum_quantity: 1 }); setModal('create'); };
  const openEdit = (item) => { setForm({ ...item }); setModal('edit'); };
  const openMove = (item) => { setSelectedItem(item); setMoveForm({ type: 'OUT', quantity: 1, notes: '' }); setModal('move'); };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/stock', form);
      showToast('Item criado com sucesso!');
      setModal(null); load();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao criar item', 'error'); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/stock/${form.id}`, form);
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
      await api.post(`/stock/${selectedItem.id}/move`, moveForm);
      showToast('Movimentação registrada com sucesso!');
      setModal(null); load();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao registrar movimentação', 'error'); }
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-center"><div className="spinner"></div><span>Carregando estoque...</span></div>;

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
        <h1 className="page-title">Estoque</h1>
        <p className="page-subtitle">Gerenciamento completo de itens e histórico de movimentações</p>
      </div>

      <div className="flex gap-8 mb-16">
        <button className={`btn ${tab === 'items' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('items')}>
          Itens em Estoque
        </button>
        <button className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('history')}>
          Histórico de Movimentações
        </button>
      </div>

      {tab === 'items' && (
        <>
          <div className="flex items-center justify-between mb-16" style={{ gap: 16 }}>
            <div style={{ position: 'relative', width: 360 }}>
              <input
                className="form-input"
                placeholder="Buscar por nome ou categoria..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <IconSearch size={16} />
              </div>
            </div>
            {can('ADMIN', 'TI') && (
              <button className="btn btn-primary" onClick={openCreate}>
                <IconPlus /> Novo Item
              </button>
            )}
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Categoria</th>
                  <th>Qtd. Atual</th>
                  <th>Mínimo</th>
                  <th>Unidade</th>
                  <th>Status</th>
                  {can('ADMIN', 'TI') && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      {item.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.description}</div>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.category}</td>
                    <td>
                      <span style={{ fontSize: 18, fontWeight: 800, color: item.status === 'CRITICAL' ? 'var(--status-critical)' : item.status === 'ALERT' ? 'var(--orange)' : 'var(--status-normal)' }}>
                        {item.current_quantity}
                      </span>
                    </td>
                    <td>{item.minimum_quantity}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.unit}</td>
                    <td><StatusBadge status={item.status} /></td>
                    {can('ADMIN', 'TI') && (
                      <td>
                        <div className="flex gap-8">
                          <button className="btn btn-secondary btn-sm" onClick={() => openMove(item)} title="Registrar Entrada ou Saída">
                            <IconArrowUpDown /> Movimentar
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)} title="Editar Item">
                            <IconEdit /> Editar
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)} title="Excluir Item">
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'history' && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Item</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Origem</th>
                <th>Chamado</th>
                <th>Solicitante</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: 12 }}>
                    {new Date(m.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ fontWeight: 600 }}>{m.item_name}</td>
                  <td>
                    <span className={`badge ${m.type === 'IN' ? 'badge-confirmed' : 'badge-alert'}`}>
                      {m.type === 'IN' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{m.quantity}</td>
                  <td>
                    <span className="badge" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                      {m.source === 'JIRA_WEBHOOK' ? 'JIRA' : m.source === 'WHATSAPP_WEBHOOK' ? 'WhatsApp' : m.source === 'MANUAL' ? 'Manual' : 'Compra'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.ticket_id || '-'}</td>
                  <td style={{ fontSize: 12 }}>{m.requester || m.user_name || '-'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Adicionar Novo Item</h2>
              <button className="modal-close" onClick={() => setModal(null)}><IconCross /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Nome do Item *</label>
                  <input className="form-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Headset USB" />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria *</label>
                  <input className="form-input" required value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Ex: Periféricos" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Especificações do item" />
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Unidade</label>
                  <input className="form-input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="unidade" />
                </div>
                <div className="form-group">
                  <label className="form-label">Qtd. Inicial</label>
                  <input className="form-input" type="number" min="0" value={form.current_quantity} onChange={e => setForm({...form, current_quantity: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Qtd. Mínima</label>
                  <input className="form-input" type="number" min="1" value={form.minimum_quantity} onChange={e => setForm({...form, minimum_quantity: parseInt(e.target.value) || 1})} />
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
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Nome</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <input className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <input className="form-input" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Unidade</label>
                  <input className="form-input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Qtd. Mínima</label>
                  <input className="form-input" type="number" min="1" value={form.minimum_quantity} onChange={e => setForm({...form, minimum_quantity: parseInt(e.target.value) || 1})} />
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
              <h2 className="modal-title">Movimentação: {selectedItem.name}</h2>
              <button className="modal-close" onClick={() => setModal(null)}><IconCross /></button>
            </div>
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              Estoque atual: <strong>{selectedItem.current_quantity} {selectedItem.unit}</strong>
            </div>
            <form onSubmit={handleMove}>
              <div className="form-group">
                <label className="form-label">Tipo de Movimentação</label>
                <div className="flex gap-8">
                  <button type="button" className={`btn ${moveForm.type === 'OUT' ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setMoveForm({...moveForm, type: 'OUT'})}>
                    Saída de Estoque
                  </button>
                  <button type="button" className={`btn ${moveForm.type === 'IN' ? 'btn-success' : 'btn-secondary'}`} onClick={() => setMoveForm({...moveForm, type: 'IN'})}>
                    Entrada de Estoque
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Quantidade</label>
                <input className="form-input" type="number" min="1" value={moveForm.quantity} onChange={e => setMoveForm({...moveForm, quantity: parseInt(e.target.value) || 1})} />
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
