import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { IconFilter, IconReports } from '../components/Icons';

const MONTH_NAMES_SHORT = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES_FULL = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const MONTH_COLORS = [
  '#FF6B00', // Orange (Farmarcas Accent)
  '#3B82F6', // Blue
  '#10B981', // Emerald Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#E11D48', // Rose
  '#A855F7', // Violet
  '#84CC16', // Lime
];

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  // Default selected months: previous 3 months or current month
  const currentMonth = now.getMonth() + 1;
  const initialMonths = currentMonth >= 3
    ? [currentMonth - 2, currentMonth - 1, currentMonth]
    : [currentMonth];

  const [selectedMonths, setSelectedMonths] = useState(initialMonths);

  const toggleMonth = (m) => {
    setSelectedMonths(prev => {
      if (prev.includes(m)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(x => x !== m).sort((a, b) => a - b);
      } else {
        return [...prev, m].sort((a, b) => a - b);
      }
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const monthsStr = selectedMonths.join(',');
      const { data: d } = await api.get(`/reports/monthly?year=${year}&months=${monthsStr}`);
      setData(d);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [year, selectedMonths]);

  const selectAllMonths = () => {
    setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  };

  const selectQuarter = (q) => {
    if (q === 1) setSelectedMonths([1, 2, 3]);
    if (q === 2) setSelectedMonths([4, 5, 6]);
    if (q === 3) setSelectedMonths([7, 8, 9]);
    if (q === 4) setSelectedMonths([10, 11, 12]);
  };

  const selectedMonthNamesStr = selectedMonths.map(m => MONTH_NAMES_SHORT[m]).join(', ');

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow)' }}>
        <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color, margin: '3px 0' }}>
            {p.name}: <strong>{p.value} unidades</strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title">Relatórios Mensais Comparativos</h1>
            <p className="page-subtitle">Selecione múltiplos meses para comparar o consumo por item lado a lado</p>
          </div>
          <div className="flex gap-8 items-center">
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Ano:</label>
            <select className="form-select" style={{ width: 100 }} value={year} onChange={e => setYear(Number(e.target.value))}>
              {[now.getFullYear(), now.getFullYear() - 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card mb-24">
        <div className="flex items-center justify-between mb-16" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="flex items-center gap-8">
            <IconFilter size={16} color="var(--orange)" />
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Selecione os Meses para Comparação
            </span>
          </div>

          <div className="flex gap-8">
            <button className="btn btn-secondary btn-sm" onClick={() => selectQuarter(1)}>1º Trimestre</button>
            <button className="btn btn-secondary btn-sm" onClick={() => selectQuarter(2)}>2º Trimestre</button>
            <button className="btn btn-secondary btn-sm" onClick={() => selectQuarter(3)}>3º Trimestre</button>
            <button className="btn btn-secondary btn-sm" onClick={() => selectQuarter(4)}>4º Trimestre</button>
            <button className="btn btn-secondary btn-sm" onClick={selectAllMonths}>Todos os Meses</button>
          </div>
        </div>

        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m, idx) => {
            const isSelected = selectedMonths.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMonth(m)}
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  minWidth: 64,
                  justifyContent: 'center',
                  background: isSelected ? 'var(--orange)' : 'var(--bg-input)',
                  borderColor: isSelected ? 'var(--orange)' : 'var(--border)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                {MONTH_NAMES_SHORT[m]}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div><span>Carregando relatório...</span></div>
      ) : !data || data.items.length === 0 ? (
        <div className="empty-state">
          <h3>Sem movimentações registradas</h3>
          <p>Não foram encontradas movimentações de saída para os meses selecionados ({selectedMonthNamesStr} {year}).</p>
        </div>
      ) : (
        <>
          <div className="grid-3 mb-24">
            <div className="stat-card orange">
              <div className="value">{data.summary.totalOut}</div>
              <div className="label">Total Saídas ({selectedMonthNamesStr})</div>
            </div>
            <div className="stat-card green">
              <div className="value">{data.summary.totalIn}</div>
              <div className="label">Total Entradas ({selectedMonthNamesStr})</div>
            </div>
            <div className="stat-card">
              <div className="value" style={{ color: 'var(--text-primary)' }}>{data.summary.totalMovements}</div>
              <div className="label">Registros Processados</div>
            </div>
          </div>

          <div className="card mb-24">
            <div className="section-header">
              <div>
                <div className="section-title" style={{ fontSize: 18, fontWeight: 800 }}>
                  Consumo por Item — <span style={{ color: 'var(--orange)' }}>{selectedMonthNamesStr} {year}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Comparação direta do volume de saídas mês a mês por item de estoque
                </div>
              </div>
            </div>

            <div className="chart-container" style={{ height: 360, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.items} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis
                    dataKey="item_name"
                    tick={{ fill: '#a0a0a0', fontSize: 12 }}
                    axisLine={{ stroke: '#333' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#a0a0a0', fontSize: 12 }}
                    axisLine={{ stroke: '#333' }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: 15, fontSize: 13 }} />

                  {/* Render distinct colored bar column for each selected month */}
                  {data.selectedMonths.map((sm, index) => (
                    <Bar
                      key={sm.month}
                      dataKey={`out_${sm.month}`}
                      name={`${sm.nameShort}`}
                      fill={MONTH_COLORS[index % MONTH_COLORS.length]}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="section-title mb-16">Tabela Comparativa de Saídas por Mês</div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Categoria</th>
                    {data.selectedMonths.map(sm => (
                      <th key={sm.month} style={{ textAlign: 'center' }}>{sm.nameShort}</th>
                    ))}
                    <th style={{ textAlign: 'right' }}>Total Geral</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(item => (
                    <tr key={item.item_id}>
                      <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{item.category}</td>
                      {data.selectedMonths.map(sm => (
                        <td key={sm.month} style={{ textAlign: 'center', fontWeight: 700, color: (item[`out_${sm.month}`] || 0) > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {item[`out_${sm.month}`] || 0}
                        </td>
                      ))}
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--orange)' }}>
                        {item.total_out_all}
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
