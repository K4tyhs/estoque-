const db = require('../database/db');

function getMonthlyReport(req, res) {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const movements = db.prepare(`
    SELECT m.item_id, s.name as item_name, s.category, s.unit,
      SUM(CASE WHEN m.type = 'IN' THEN m.quantity ELSE 0 END) as total_in,
      SUM(CASE WHEN m.type = 'OUT' THEN m.quantity ELSE 0 END) as total_out,
      COUNT(*) as total_movements
    FROM stock_movements m
    JOIN stock_items s ON m.item_id = s.id
    WHERE strftime('%Y-%m', m.created_at) = ?
    GROUP BY m.item_id
    ORDER BY total_out DESC
  `).all(monthStr);

  // Previous month comparison
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const prevMovements = db.prepare(`
    SELECT m.item_id,
      SUM(CASE WHEN m.type = 'OUT' THEN m.quantity ELSE 0 END) as total_out
    FROM stock_movements m
    WHERE strftime('%Y-%m', m.created_at) = ?
    GROUP BY m.item_id
  `).all(prevMonthStr);

  const prevMap = {};
  prevMovements.forEach(p => { prevMap[p.item_id] = p.total_out; });

  const report = movements.map(m => {
    const prevOut = prevMap[m.item_id] || 0;
    const diff = m.total_out - prevOut;
    const pct = prevOut > 0 ? ((diff / prevOut) * 100).toFixed(1) : null;
    return {
      ...m,
      prev_total_out: prevOut,
      diff_out: diff,
      pct_change: pct,
      trend: diff > 0 ? 'UP' : diff < 0 ? 'DOWN' : 'STABLE',
    };
  });

  const totalIn = movements.reduce((s, m) => s + m.total_in, 0);
  const totalOut = movements.reduce((s, m) => s + m.total_out, 0);

  const dailyTrend = db.prepare(`
    SELECT strftime('%d', created_at) as day,
      SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END) as out_qty
    FROM stock_movements
    WHERE strftime('%Y-%m', created_at) = ?
    GROUP BY strftime('%d', created_at)
    ORDER BY day ASC
  `).all(monthStr);

  return res.json({
    year, month, monthStr,
    summary: { totalIn, totalOut, totalMovements: movements.reduce((s, m) => s + m.total_movements, 0) },
    items: report,
    dailyTrend,
  });
}

function getAvailableMonths(req, res) {
  const months = db.prepare(`
    SELECT DISTINCT strftime('%Y', created_at) as year, strftime('%m', created_at) as month
    FROM stock_movements
    ORDER BY year DESC, month DESC
    LIMIT 12
  `).all();
  return res.json(months);
}

module.exports = { getMonthlyReport, getAvailableMonths };
