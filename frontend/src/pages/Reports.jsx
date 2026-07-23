import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const MONTHS_PT = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const load = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get(`/reports/monthly?year=${year}&month=${month}`);
      setData(d);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [year, month]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
        {payload.map(p => <div key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>)}
      </div>
    );
  };

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">📈 Relatórios Mensais</h1>
            <p className="page-subtitle">Insights de consumo e comparação com mês anterior</p>
          </div>
          <div className="flex gap-8">
            <select className="form-select" style={{width:130}} value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS_PT.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select className="form-select" style={{width:90}} value={year} onChange={e => setYear(Number(e.target.value))}>
              {[now.getFullYear(), now.getFullYear()-1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : !data || data.items.length === 0 ? (
        <div className="empty-state"><div className="icon">📊</div><h3>Sem dados para {MONTHS_PT[month]} {year}</h3><p>Os dados aparecerão conforme as movimentações forem registradas.</p></div>
      ) : (
        <>
          <div className="grid-3 mb-24">
            <div className="stat-card orange">
              <div className="value">{data.summary.totalOut}</div>
              <div className="label">Total Saídas</div>
            </div>
            <div className="stat-card green">
              <div className="value">{data.summary.totalIn}</div>
              <div className="label">Total Entradas</div>
            </div>
            <div className="stat-card">
              <div className="value" style={{ color: 'var(--text-primary)' }}>{data.summary.totalMovements}</div>
              <div className="label">Total Movimentações</div>
            </div>
          </div>

          <div className="card mb-24">
            <div className="section-title mb-16">Consumo por Item — {MONTHS_PT[month]}</div>
            <div className="chart-container" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.items} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="item_name" tick={{ fill: '#a0a0a0', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#a0a0a0', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#a0a0a0' }} />
                  <Bar dataKey="total_out" name="Saídas" fill="#FF6B00" radius={[4,4,0,0]} />
                  <Bar dataKey="total_in" name="Entradas" fill="#22c55e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {data.dailyTrend.length > 0 && (
            <div className="card mb-24">
              <div className="section-title mb-16">Tendência Diária de Saídas — {MONTHS_PT[month]}</div>
              <div className="chart-container" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.dailyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="day" tick={{ fill: '#a0a0a0', fontSize: 11 }} tickFormatter={d => `Dia ${d}`} />
                    <YAxis tick={{ fill: '#a0a0a0', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="out_qty" name="Saídas" stroke="#FF6B00" strokeWidth={2} dot={{ fill: '#FF6B00', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="card">
            <div className="section-title mb-16">Comparação vs Mês Anterior</div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Categoria</th>
                    <th>Saídas ({MONTHS_PT[month]})</th>
                    <th>Saídas (Mês ant.)</th>
                    <th>Variação</th>
                    <th>Tendência</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(item => (
                    <tr key={item.item_id}>
                      <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{item.category}</td>
                      <td style={{ fontWeight: 700 }}>{item.total_out}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{item.prev_total_out}</td>
                      <td>
                        <span style={{ color: item.diff_out > 0 ? 'var(--status-critical)' : item.diff_out < 0 ? 'var(--status-normal)' : 'var(--text-secondary)', fontWeight: 600 }}>
                          {item.diff_out > 0 ? '+' : ''}{item.diff_out}
                          {item.pct_change && <span style={{ fontSize: 11, marginLeft: 4 }}>({item.pct_change}%)</span>}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 18 }}>
                          {item.trend === 'UP' ? '📈' : item.trend === 'DOWN' ? '📉' : '➞'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
