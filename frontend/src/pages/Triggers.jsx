import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function Triggers() {
  const [config, setConfig] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    try {
      const { data } = await api.get('/triggers');
      setConfig(data.config);
      setItems(data.items);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateGlobal = async (updates) => {
    setSaving(true);
    try {
      const { data } = await api.put('/triggers', updates);
      setConfig(data.config);
      showToast('Configuração salva!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro', 'error');
    } finally { setSaving(false); }
  };

  const updateItemMin = async (itemId, minimum_quantity) => {
    try {
      await api.put(`/triggers/item/${itemId}`, { minimum_quantity });
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, minimum_quantity } : i));
      showToast('Limite atualizado!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro', 'error');
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

  return (
    <div className="page-container fade-in">
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999 }}>
          <div className={`alert alert-${toast.type === 'error' ? 'error' : 'success'}`} style={{ minWidth: 280 }}>
            {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
          </div>
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">⚡ Painel de Triggers</h1>
        <p className="page-subtitle">Gerencie as automações do sistema · Todos desativados por padrão</p>
      </div>

      <div className="card mb-24">
        <div className="section-title mb-16">🌐 Controles Globais</div>
        <div className="alert alert-warning mb-16">
          ⚠️ Ative apenas após configurar as variáveis de ambiente (EMAIL e JIRA) no arquivo .env do backend.
        </div>

        <div className="flex-col gap-16">
          <div style={{ padding: '16px 20px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Automações Globais</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Master switch — desligar aqui desativa tudo</div>
              </div>
              <div className="toggle-wrapper">
                <span style={{ fontSize: 12, color: config.is_globally_active ? 'var(--status-normal)' : 'var(--text-muted)' }}>
                  {config.is_globally_active ? 'ATIVO' : 'INATIVO'}
                </span>
                <button
                  className={`toggle ${config.is_globally_active ? 'active' : ''}`}
                  onClick={() => updateGlobal({ is_globally_active: !config.is_globally_active })}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 20px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', opacity: config.is_globally_active ? 1 : 0.5 }}>
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>📧 Alertas por Email</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Envia email para ti@farmarcas.com.br quando estoque atingir o mínimo</div>
              </div>
              <div className="toggle-wrapper">
                <span style={{ fontSize: 12, color: config.email_alerts_active ? 'var(--status-normal)' : 'var(--text-muted)' }}>
                  {config.email_alerts_active ? 'ATIVO' : 'INATIVO'}
                </span>
                <button
                  className={`toggle ${config.email_alerts_active ? 'active' : ''}`}
                  onClick={() => updateGlobal({ email_alerts_active: !config.email_alerts_active })}
                  disabled={saving || !config.is_globally_active}
                />
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 20px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', opacity: config.is_globally_active ? 1 : 0.5 }}>
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>🔵 Integração JIRA</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Cria tarefa no JIRA automaticamente ao confirmar pedido de compra</div>
              </div>
              <div className="toggle-wrapper">
                <span style={{ fontSize: 12, color: config.jira_integration_active ? 'var(--status-normal)' : 'var(--text-muted)' }}>
                  {config.jira_integration_active ? 'ATIVO' : 'INATIVO'}
                </span>
                <button
                  className={`toggle ${config.jira_integration_active ? 'active' : ''}`}
                  onClick={() => updateGlobal({ jira_integration_active: !config.jira_integration_active })}
                  disabled={saving || !config.is_globally_active}
                />
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 20px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>📅 Cobertura do Estoque</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Dias de consumo que o pedido preditivo deve cobrir</div>
              </div>
              <div className="flex items-center gap-8">
                <input
                  type="number" min="30" max="90"
                  className="form-input"
                  style={{ width: 80, textAlign: 'center' }}
                  value={config.coverage_days}
                  onChange={e => setConfig({ ...config, coverage_days: parseInt(e.target.value) })}
                />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>dias</span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => updateGlobal({ coverage_days: config.coverage_days })}
                  disabled={saving}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">📊 Limites Mínimos por Item</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Altere o valor e pressione Enter ou clique fora para salvar</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Categoria</th>
                <th>Qtd. Atual</th>
                <th>Limite Mínimo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const status = item.current_quantity <= 0 ? 'CRITICAL' : item.current_quantity <= item.minimum_quantity ? 'ALERT' : 'NORMAL';
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.category}</td>
                    <td style={{ fontWeight: 700, color: status === 'CRITICAL' ? 'var(--status-critical)' : status === 'ALERT' ? 'var(--orange)' : 'var(--status-normal)' }}>
                      {item.current_quantity}
                    </td>
                    <td>
                      <MinEditor
                        value={item.minimum_quantity}
                        onSave={val => updateItemMin(item.id, val)}
                      />
                    </td>
                    <td>
                      <span className={`badge badge-${status.toLowerCase()}`}>
                        {status === 'CRITICAL' ? '🔴 Crítico' : status === 'ALERT' ? '⚠️ Alerta' : '✓ Normal'}
                      </span>
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

function MinEditor({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  const save = () => {
    setEditing(false);
    if (val !== value && val >= 0) onSave(val);
  };

  return editing ? (
    <input
      type="number" min="0"
      className="form-input"
      style={{ width: 80 }}
      value={val}
      onChange={e => setVal(parseInt(e.target.value))}
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
      autoFocus
    />
  ) : (
    <div
      onClick={() => setEditing(true)}
      style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid transparent' }}
      title="Clique para editar"
    >
      <strong>{value}</strong>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>✎</span>
    </div>
  );
}
