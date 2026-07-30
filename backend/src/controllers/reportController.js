const db = require('../database/db');

const MONTH_NAMES_SHORT = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES_FULL = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function getMonthlyReport(req, res) {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    let months = [];

    if (req.query.months) {
      months = req.query.months.toString().split(',').map(m => parseInt(m.trim())).filter(m => m >= 1 && m <= 12);
    } else if (req.query.month) {
      months = [parseInt(req.query.month)];
    }

    if (months.length === 0) {
      months = [new Date().getMonth() + 1];
    }

    months.sort((a, b) => a - b);

    const selectedMonths = months.map(m => ({
      month: m,
      nameShort: MONTH_NAMES_SHORT[m],
      nameFull: MONTH_NAMES_FULL[m],
      key: `month_${m}`,
      yearMonthStr: `${year}-${String(m).padStart(2, '0')}`,
    }));

    // Fetch all items active or moved
    const allItems = db.prepare('SELECT id, name, category, unit FROM stock_items ORDER BY category, name').all();

    // Query movements for selected months
    const monthPlaceholders = selectedMonths.map(sm => `'${sm.yearMonthStr}'`).join(',');

    const movementsQuery = `
      SELECT
        m.item_id,
        s.name as item_name,
        s.category,
        m.type,
        m.quantity,
        strftime('%Y-%m', m.created_at) as year_month,
        CAST(strftime('%m', m.created_at) AS INTEGER) as month_num
      FROM stock_movements m
      JOIN stock_items s ON m.item_id = s.id
      WHERE strftime('%Y', m.created_at) = ?
        AND CAST(strftime('%m', m.created_at) AS INTEGER) IN (${months.join(',')})
    `;

    const movements = db.prepare(movementsQuery).all(String(year));

    // Aggregate by item and month
    const itemsMap = {};
    allItems.forEach(item => {
      itemsMap[item.id] = {
        item_id: item.id,
        item_name: item.name,
        category: item.category,
        unit: item.unit,
        total_out_all: 0,
        total_in_all: 0,
      };
      selectedMonths.forEach(sm => {
        itemsMap[item.id][`out_${sm.month}`] = 0;
        itemsMap[item.id][`in_${sm.month}`] = 0;
      });
    });

    let totalOutOverall = 0;
    let totalInOverall = 0;
    let totalMovementsCount = movements.length;

    movements.forEach(m => {
      if (!itemsMap[m.item_id]) {
        itemsMap[m.item_id] = {
          item_id: m.item_id,
          item_name: m.item_name,
          category: m.category,
          unit: '',
          total_out_all: 0,
          total_in_all: 0,
        };
        selectedMonths.forEach(sm => {
          itemsMap[m.item_id][`out_${sm.month}`] = 0;
          itemsMap[m.item_id][`in_${sm.month}`] = 0;
        });
      }

      if (m.type === 'OUT') {
        itemsMap[m.item_id][`out_${m.month_num}`] = (itemsMap[m.item_id][`out_${m.month_num}`] || 0) + m.quantity;
        itemsMap[m.item_id].total_out_all += m.quantity;
        totalOutOverall += m.quantity;
      } else if (m.type === 'IN') {
        itemsMap[m.item_id][`in_${m.month_num}`] = (itemsMap[m.item_id][`in_${m.month_num}`] || 0) + m.quantity;
        itemsMap[m.item_id].total_in_all += m.quantity;
        totalInOverall += m.quantity;
      }
    });

    const reportItems = Object.values(itemsMap).filter(item => item.total_out_all > 0 || item.total_in_all > 0);

    return res.json({
      year,
      selectedMonths,
      summary: {
        totalOut: totalOutOverall,
        totalIn: totalInOverall,
        totalMovements: totalMovementsCount,
      },
      items: reportItems,
    });
  } catch (err) {
    console.error('[REPORT] Erro ao gerar relatório:', err);
    return res.status(500).json({ error: 'Erro interno ao gerar relatório' });
  }
}

function getAvailableMonths(req, res) {
  const months = db.prepare(`
    SELECT DISTINCT strftime('%Y', created_at) as year, strftime('%m', created_at) as month
    FROM stock_movements
    ORDER BY year DESC, month DESC
  `).all();
  return res.json(months);
}

module.exports = { getMonthlyReport, getAvailableMonths };
