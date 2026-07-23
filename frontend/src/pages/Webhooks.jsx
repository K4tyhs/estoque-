import React, { useState, useEffect } from 'react';
import api from '../services/api';

const SOURCE_MAP = { JIRA: { label: 'JIRA', cls: 'badge-jira', icon: '🔵' }, WHATSAPP: { label: 'WhatsApp', cls: 'badge-whatsapp', icon: '🟢' }, MANUAL_SIM: { label: 'Simulador', cls: 'badge-pending', icon: '🧪' } };
const STATUS_MAP = { SUCCESS: 'badge-success', ERROR: 'badge-error', IGNORED: 'badge-ignored' };

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
    setSimLoading(true); setSimResult(null);
    try {
      const { data } = await api.post('/webhooks/simulate', simForm);
      setSimResult({ type: 'success', data });
      const logsRes = await api.get('/webhooks/logs');
      setLogs(logsRes.data);
      const itemsRes = await api.get('/stock');
      setItems(itemsRes.data);
    } catch (err) {
      setSimResult({ type: 'error', msg: err.response?.data?.error || 'Erro' });
    } finally { setSimLoading(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">🔗 Webhooks</h1>
        <p className="page-subtitle">Logs de integração e simulador de chamados</p>
      </div>

      <div className="flex gap-8 mb-16">
        <button className={`btn ${tab === 'logs' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('logs')}>📜 Logs ({logs.length})</button>
        <button className={`btn ${tab === 'sim' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('sim')}>🧪 Simulador</button>
        <button className={`btn ${tab === 'docs' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('docs')}>📖 Documentação</button>
      </div>

      {tab === 'logs' && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Fonte</th>
                <th>Item</th>
                <th>Chamado</th>
                <th>Solicitante</th>
                <th>Qtd</th>
                <th>Status</th>
                <th>Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><div className="icon">📕</div><h3>Nenhum log ainda</h3><p>Os logs aparecerão aqui após receber webhooks.</p></div></td></tr>
              ) : logs.map(l => {
                const src = SOURCE_MAP[l.source] || SOURCE_MAP.MANUAL_SIM;
                return (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                    <td><span className={`badge ${src.cls}`}>{src.icon} {src.label}</span></td>
                    <td style={{ fontWeight: 600 }}>{l.item_name || '-'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.ticket_id || '-'}</td>
                    <td style={{ fontSize: 12 }}>{l.requester || '-'}</td>
                    <td style={{ fontWeight: 700 }}>{l.quantity_moved ?? '-'}</td>
                    <td><span className={`badge ${STATUS_MAP[l.status]}`}>{l.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200 }}>{l.message}</td>
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
            <div className="section-title mb-16">🧪 Simulador de Webhook</div>
            <div className="alert alert-info mb-16">Use o simulador para testar o fluxo sem precisar do JIRA ou WhatsApp reais.</div>
            <form onSubmit={simulate}>
              <div className="form-group">
                <label className="form-label">Origem</label>
                <div className="flex gap-8">
                  <button type="button" className={`btn ${simForm.source === 'JIRA' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSimForm({...simForm, source: 'JIRA'})}>🔵 JIRA</button>
                  <button type="button" className={`btn ${simForm.source === 'WHATSAPP' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSimForm({...simForm, source: 'WHATSAPP'})}>🟢 WhatsApp</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Item *</label>
                <select className="form-select" required value={simForm.item_id} onChange={e => setSimForm({...simForm, item_id: e.target.value})}>
                  <option value="">Selecione um item...</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} (atual: {i.current_quantity})</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Quantidade *</label>
                  <input type="number" min="1" className="form-input" required value={simForm.quantity} onChange={e => setSimForm({...simForm, quantity: parseInt(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nº do Chamado</label>
                  <input className="form-input" value={simForm.ticket_id} onChange={e => setSimForm({...simForm, ticket_id: e.target.value})} placeholder={simForm.source === 'JIRA' ? 'TI-1050' : 'WA-2024-001'} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Solicitante</label>
                <input className="form-input" value={simForm.requester} onChange={e => setSimForm({...simForm, requester: e.target.value})} placeholder="Nome do colaborador" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={simLoading} style={{ width: '100%', justifyContent: 'center' }}>
                {simLoading ? <><div className="spinner" style={{width:16,height:16}}></div> Enviando...</> : 'Simular Chamado'}
              </button>
            </form>
            {simResult && (
              <div className={`alert alert-${simResult.type} mt-16`}>
                {simResult.type === 'success' ? (
                  <><strong>✅ Sucesso!</strong><br />{simResult.data.message}<br />Nova quantidade: <strong>{simResult.data.newQuantity}</strong>{simResult.data.alertSent && <><br />📧 Alerta de email enviado para a equipe TI</>}</>
                ) : (
                  <><strong>❌ Erro:</strong> {simResult.msg}</>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'docs' && (
        <div style={{ maxWidth: 760 }}>
          <div className="card">
            <div className="section-title mb-16">📖 Documentação dos Endpoints</div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--orange)' }}>POST /api/webhooks/jira</div>
              <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--status-normal)' }}>POST /api/webhooks/whatsapp</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Endpoints públicos para receber baixas de estoque via chamados aprovados. Envie o header <code style={{background:'var(--bg-input)',padding:'2px 6px',borderRadius:4}}>x-webhook-secret</code> com o token configurado no .env.</div>
              <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}>// Payload esperado (JSON)</div>
                {'{'}<br />
                &nbsp;&nbsp;<span style={{color:'#60b4ff'}}>"item_id"</span>: <span style={{color:'#86efac'}}>1</span>, <span style={{color:'var(--text-muted)'}}>// ID do item no sistema</span><br />
                &nbsp;&nbsp;<span style={{color:'#60b4ff'}}>"quantity"</span>: <span style={{color:'#86efac'}}>2</span>, <span style={{color:'var(--text-muted)'}}>// Quantidade a dar baixa</span><br />
                &nbsp;&nbsp;<span style={{color:'#60b4ff'}}>"requester"</span>: <span style={{color:'#fca5a5'}}>"João Silva"</span>, <span style={{color:'var(--text-muted)'}}>// Nome do solicitante</span><br />
                &nbsp;&nbsp;<span style={{color:'#60b4ff'}}>"ticket_id"</span>: <span style={{color:'#fca5a5'}}>"TI-1050"</span> <span style={{color:'var(--text-muted)'}}>// Número do chamado</span><br />
                {'}'}
              </div>
            </div>

            <div className="divider" />

            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>IDs dos Itens no Sistema</div>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>ID</th><th>Nome</th><th>Qtd. Atual</th></tr></thead>
                  <tbody>
                    {items.map(i => <tr key={i.id}><td><code style={{background:'var(--bg-input)',padding:'2px 8px',borderRadius:4}}>{i.id}</code></td><td>{i.name}</td><td>{i.current_quantity}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
