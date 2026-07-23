const db = require('../database/db');
const { calculatePredictiveQuantity } = require('../services/predictiveService');
const { createJiraTask } = require('../services/jiraService');

function getPurchaseOrders(req, res) {
  const { status } = req.query;
  let query = `
    SELECT po.*, s.name as item_name, s.current_quantity, s.minimum_quantity, s.unit, s.category,
      u.name as confirmed_by_name
    FROM purchase_orders po
    JOIN stock_items s ON po.item_id = s.id
    LEFT JOIN users u ON po.confirmed_by = u.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { query += ' AND po.status = ?'; params.push(status); }
  query += ' ORDER BY po.created_at DESC';
  return res.json(db.prepare(query).all(...params));
}

async function confirmPurchaseOrder(req, res) {
  const po = db.prepare(`
    SELECT po.*, s.name as item_name, s.current_quantity, s.minimum_quantity, s.unit
    FROM purchase_orders po
    JOIN stock_items s ON po.item_id = s.id
    WHERE po.id = ? AND po.status = 'PENDING'
  `).get(req.params.id);

  if (!po) return res.status(404).json({ error: 'Pedido não encontrado ou já processado' });

  const config = db.prepare('SELECT * FROM automation_config WHERE id = 1').get();
  let jiraResult = { success: false, reason: 'integration_disabled' };

  if (config && config.jira_integration_active) {
    const prediction = {
      dailyAverage: po.daily_average,
      daysSinceLastOrder: po.days_since_last_order,
      coverageDays: po.coverage_days,
    };
    jiraResult = await createJiraTask({
      itemName: po.item_name,
      quantity: po.predicted_quantity,
      predictiveDetails: prediction,
      currentQuantity: po.current_quantity,
    });
  }

  db.prepare(`
    UPDATE purchase_orders
    SET status = 'CONFIRMED',
        confirmed_at = datetime('now'),
        confirmed_by = ?,
        jira_task_id = ?,
        jira_task_url = ?
    WHERE id = ?
  `).run(req.user.id, jiraResult.taskId || null, jiraResult.taskUrl || null, po.id);

  return res.json({
    message: 'Pedido confirmado com sucesso',
    jiraTask: jiraResult.success ? { id: jiraResult.taskId, url: jiraResult.taskUrl } : null,
    jiraEnabled: config && config.jira_integration_active,
  });
}

function cancelPurchaseOrder(req, res) {
  const po = db.prepare(`SELECT id FROM purchase_orders WHERE id = ? AND status = 'PENDING'`).get(req.params.id);
  if (!po) return res.status(404).json({ error: 'Pedido não encontrado ou já processado' });
  db.prepare(`UPDATE purchase_orders SET status = 'CANCELLED', confirmed_at = datetime('now'), confirmed_by = ? WHERE id = ?`).run(req.user.id, po.id);
  return res.json({ message: 'Pedido cancelado' });
}

function recalculate(req, res) {
  const { item_id } = req.params;
  const item = db.prepare('SELECT * FROM stock_items WHERE id = ? AND is_active = 1').get(item_id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  const prediction = calculatePredictiveQuantity(item.id, item.current_quantity, item.minimum_quantity);
  return res.json({ item: item.name, ...prediction });
}

module.exports = { getPurchaseOrders, confirmPurchaseOrder, cancelPurchaseOrder, recalculate };
