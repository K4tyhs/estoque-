import React from 'react';

export default function StatusBadge({ status }) {
  const map = {
    NORMAL: { label: 'Normal', cls: 'badge-normal', dot: '#22c55e' },
    ALERT: { label: 'Alerta', cls: 'badge-alert', dot: '#FF6B00' },
    CRITICAL: { label: 'Crítico', cls: 'badge-critical', dot: '#ef4444' },
  };
  const s = map[status] || map.NORMAL;
  return (
    <span className={`badge ${s.cls}`}>
      <span className="badge-dot" style={{ backgroundColor: s.dot }} />
      {s.label}
    </span>
  );
}
