import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { IconCheck, IconCross, IconAlert, IconInfo } from '../components/Icons';

const SOURCE_MAP = {
  JIRA: { label: 'JIRA', cls: 'badge-jira' },
  WHATSAPP: { label: 'WhatsApp', cls: 'badge-whatsapp' },
  MANUAL_SIM: { label: 'Simulador', cls: 'badge-pending' }
};

const STATUS_MAP = {
  SUCCESS: 'badge-success',
  ERROR: 'badge-error',
  IGNORED: 'badge-ignored'
};

export default function Webhooks() {
  const [logs, setLogs] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simForm, setSimForm] = useState({ source: 'JIRA', item_id: '', quantity: 1, requester: '', ticket_id: '' });
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [tab, setTab] = useState('logs');

  useEffect(() => {
    async function load() {
      try {
        const [logsRes, itemsRes] = await Promise.all([api.get('/webhooks/logs'), api.get('/stock')]);
        setLogs(logsRes.data);
        setItems(itemsRes.data);
      } catch {} finally { setLoading(false); }
    }
    load();
  }, []);

  const simulate = async (e) => {
    e.preventDefault();
    setSimLoading(true);
    setSimResult(null);
    try {
      const { data } = await api.post('/webhooks/simulate', simForm);
      setSimResult({ type: 'success', data });
      const logsRes = await api.get('/webhooks/logs');
      setLogs(logsRes.data);
      const itemsRes = await api.get('/stock');
      setItems(itemsRes.data);
    } catch (err) {
      setSimResult({ type: 'error', msg: err.response?.data?.error || 'Erro ao processar simulação' });
    } finally { setSimLoading(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner"></div><span>Carregando logs...</span></div>;

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">Webhooks e Integrações</h1>
        <p className="page-subtitle">Logs de integração de chamados do JIRA e WhatsApp e simulador de baixas</p>
      </div>

      <div className="flex gap-8 mb-16">
        <button className={`btn ${tab === 'logs' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('logs')}>
          Logs de Integração ({logs.length})
        </button>
        <button className={`btn ${tab === 'sim' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('sim')}>
          Simulador de Chamados
        </button>
      </div>

      {tab === 'logs' && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Origem</th>
                <th>Item</th>
                <th>Nº do Chamado</th>
                <th>Solicitante</th>
                <th>Quantidade</th>
                <th>Status</th>
                <th>Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <h3>Nenhum log registrado</h3>
                      <p>Os eventos de webhook aparecerão nesta tabela conforme forem recebidos.</p>
                    </div>
                  </td>
                </tr>
              ) : logs.map(l => {
                const src = SOURCE_MAP[l.source] || SOURCE_MAP.MANUAL_SIM;
                return (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {new Date(l.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td><span className={`badge ${src.cls}`}>{src.label}</span></td>
                    <td style={{ fontWeight: 600 }}>{l.item_name || '-'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.ticket_id || '-'}</td>
                    <td style={{ fontSize: 12 }}>{l.requester || '-'}</td>
                    <td style={{ fontWeight: 700 }}>{l.quantity_moved ?? '-'}</td>
                    <td><span className={`badge ${STATUS_MAP[l.status]}`}>{l.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 220 }}>{l.message}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sim' && (
        <div style={{ maxWidth: 560 }}>
          <div className="card">
            <div className="section-title mb-16">Simulador de Webhook de Chamado</div>
            <div className="alert alert-info mb-16">
              <IconInfo /> Use o simulador para testar a baixa automática de estoque sem depender de chamados reais do JIRA ou WhatsApp.
            </div>
            <form onSubmit={simulate}>
              <div className="form-group">
                <label className="form-label">Origem do Chamado</label>
                <div className="flex gap-8">
                  <button
                    type="button"
                    className={`btn ${simForm.source === 'JIRA' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSimForm({ ...simForm, source: 'JIRA' })}
                  >
                    JIRA
                  </button>
                  <button
                    type="button"
                    className={`btn ${simForm.source === 'WHATSAPP' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSimForm({ ...simForm, source: 'WHATSAPP' })}
                  >
                    WhatsApp
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Item Solicitado *</label>
                <select
                  className="form-select"
                  required
                  value={simForm.item_id}
                  onChange={e => setSimForm({ ...simForm, item_id: e.target.value })}
                >
                  <option value="">Selecione um item...</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} (Atual: {i.current_quantity})</option>
                  ))}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Quantidade Baixada *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    required
                    value={simForm.quantity}
                    onChange={e => setSimForm({ ...simForm, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nº do Chamado</label>
                  <input
                    className="form-input"
                    value={simForm.ticket_id}
                    onChange={e => setSimForm({ ...simForm, ticket_id: e.target.value })}
                    placeholder={simForm.source === 'JIRA' ? 'TI-1050' : 'WA-2024-001'}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Solicitante</label>
                <input
                  className="form-input"
                  value={simForm.requester}
                  onChange={e => setSimForm({ ...simForm, requester: e.target.value })}
                  placeholder="Nome do colaborador"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={simLoading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              >
                {simLoading ? <><div className="spinner" style={{width:16,height:16}}></div> Processando...</> : 'Simular Chamado'}
              </button>
            </form>
            {simResult && (
              <div className={`alert alert-${simResult.type} mt-16`}>
                {simResult.type === 'success' ? (
                  <div>
                    <strong>Sucesso no processamento!</strong>
                    <div style={{ marginTop: 4 }}>{simResult.data.message}</div>
                    <div style={{ marginTop: 2 }}>Estoque atualizado: <strong>{simResult.data.newQuantity} unidades</strong></div>
                    {simResult.data.alertSent && <div style={{ marginTop: 2 }}>E-mail de alerta disparado para a equipe TI.</div>}
                  </div>
                ) : (
                  <div><strong>Erro:</strong> {simResult.msg}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
