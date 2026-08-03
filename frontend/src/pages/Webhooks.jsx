import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { IconCheck, IconAlert, IconCross } from '../components/Icons';

export default function Webhooks() {
  const { can } = useAuth();
  const [logs, setLogs] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simForm, setSimForm] = useState({
    item_id: '',
    quantity: 1,
    source: 'JIRA',
    ticket_id: 'JIRA-101',
    requester: 'ti@farmarcas.com.br'
  });
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const load = async () => {
    try {
      const [logsRes, itemsRes] = await Promise.all([
        api.get('/webhooks/logs'),
        api.get('/stock'),
      ]);
      setLogs(logsRes.data);
      setItems(itemsRes.data);
      if (itemsRes.data.length > 0 && !simForm.item_id) {
        setSimForm(prev => ({ ...prev, item_id: itemsRes.data[0].id }));
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const simulate = async (e) => {
    e.preventDefault();
    setSimLoading(true);
    setSimResult(null);
    try {
      const payload = {
        item_id: parseInt(simForm.item_id),
        quantity: parseInt(simForm.quantity) || 1,
        source: simForm.source,
        ticket_id: simForm.ticket_id,
        requester: simForm.requester
      };
      const { data } = await api.post('/webhooks/simulate', payload);
      setSimResult({ type: 'success', msg: data.message || 'Baixa de estoque realizada com sucesso!' });
      load();
    } catch (err) {
      setSimResult({ type: 'error', msg: err.response?.data?.error || 'Erro ao processar simulação' });
    } finally { setSimLoading(false); }
  };

  const formatPayloadDetails = (log) => {
    let obj = {};
    try {
      obj = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
    } catch {
      obj = {};
    }
    const itemName = log.item_name || (items.find(i => String(i.id) === String(log.item_id))?.name) || `Item #${log.item_id || obj.item_id || '-'}`;
    const qty = log.quantity_moved || obj.quantity || '-';
    const requester = log.requester || obj.requester || '-';
    const ticket = log.ticket_id || obj.ticket_id || '-';

    return (
      <div>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{itemName}</span>
        <span style={{ marginLeft: 8, color: 'var(--orange)', fontWeight: 700 }}>(-{qty})</span>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          Chamado: {ticket} | Solicitante: {requester}
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading-center"><div className="spinner"></div><span>Carregando webhooks...</span></div>;

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">Integração de Entradas (Jira / WhatsApp)</h1>
        <p className="page-subtitle">Simule chamados de baixa de estoque originados do Jira e WhatsApp para dar vazão ao material</p>
      </div>

      <div className="grid-2 mb-24" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="section-title mb-16">Simulador de Chamados de Saída de Estoque</div>
          <form onSubmit={simulate}>
            <div className="form-group">
              <label className="form-label">Origem do Chamado *</label>
              <select
                className="form-select"
                value={simForm.source}
                onChange={e => setSimForm({
                  ...simForm,
                  source: e.target.value,
                  ticket_id: e.target.value === 'JIRA' ? 'JIRA-101' : 'WA-2026-001'
                })}
              >
                <option value="JIRA">Jira Ticket (Sistema de Chamados)</option>
                <option value="WHATSAPP">WhatsApp Bot (Atendimento Direto)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Item a ser Retirado *</label>
              <select
                className="form-select"
                value={simForm.item_id}
                onChange={e => setSimForm({ ...simForm, item_id: e.target.value })}
                required
              >
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category}) — Qtd Atual: {item.current_quantity} (Mín: {item.minimum_quantity})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Quantidade para Baixa *</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  required
                  value={simForm.quantity}
                  onChange={e => setSimForm({ ...simForm, quantity: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nº do Chamado / Protocolo</label>
                <input
                  className="form-input"
                  value={simForm.ticket_id}
                  onChange={e => setSimForm({ ...simForm, ticket_id: e.target.value })}
                  placeholder="EX: JIRA-101 ou WA-001"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">E-mail do Solicitante</label>
              <input
                type="email"
                className="form-input"
                value={simForm.requester}
                onChange={e => setSimForm({ ...simForm, requester: e.target.value })}
                placeholder="colaborador@farmarcas.com.br"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={simLoading}>
              {simLoading ? <><div className="spinner" style={{width:16,height:16}}></div> Processando Baixa...</> : `Simular Baixa via ${simForm.source}`}
            </button>
          </form>

          {simResult && (
            <div className={`alert alert-${simResult.type === 'error' ? 'error' : 'success'}`} style={{ marginTop: 16 }}>
              {simResult.type === 'error' ? <IconAlert size={16} /> : <IconCheck size={16} />}
              <span style={{ marginLeft: 8 }}>{simResult.msg}</span>
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title mb-16">Endpoints de Webhook de Entrada</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
            Configure o Jira e o WhatsApp Bot para enviar requisições HTTP POST para dar baixa automática no estoque:
          </p>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', marginBottom: 4 }}>📌 Webhook Jira</div>
            <div style={{ background: 'var(--bg-dark)', padding: '10px 14px', borderRadius: 8, fontFamily: 'monospace', fontSize: 12, border: '1px solid var(--border)' }}>
              POST http://localhost:3001/api/webhooks/jira
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', marginBottom: 4 }}>📌 Webhook WhatsApp</div>
            <div style={{ background: 'var(--bg-dark)', padding: '10px 14px', borderRadius: 8, fontFamily: 'monospace', fontSize: 12, border: '1px solid var(--border)' }}>
              POST http://localhost:3001/api/webhooks/whatsapp
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title mb-16">Histórico de Chamados Recebidos</div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Origem</th>
                <th>Status</th>
                <th>Detalhes do Chamado e Movimentação</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <h3>Nenhum registro de chamado encontrado</h3>
                      <p>Utilize o simulador acima para disparar baixas de estoque.</p>
                    </div>
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', whitespace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleDateString('pt-BR')} {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                  </td>
                  <td>
                    <span className={`badge ${log.source === 'JIRA' ? 'badge-ti' : 'badge-patrimonio'}`}>
                      {log.source}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${log.status === 'SUCCESS' ? 'badge-confirmed' : log.status === 'IGNORED' ? 'badge-pending' : 'badge-cancelled'}`}>
                      {log.status === 'SUCCESS' ? 'Baixa Concluída' : log.status === 'IGNORED' ? 'Ignorado' : 'Erro'}
                    </span>
                  </td>
                  <td>
                    {formatPayloadDetails(log)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
