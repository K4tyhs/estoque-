import React from 'react';

export default function StatusBadge({ status }) {
  const map = {
    NORMAL: { label: 'Normal', cls: 'badge-normal', icon: '✓' },
    ALERT: { label: 'Alerta', cls: 'badge-alert', icon: '⚠️' },
    CRITICAL: { label: 'Crítico', cls: 'badge-critical', icon: '🔴' },
  };
  const s = map[status] || map.NORMAL;
  return <span className={`badge ${s.cls}`}>{s.icon} {s.label}</span>;
}
