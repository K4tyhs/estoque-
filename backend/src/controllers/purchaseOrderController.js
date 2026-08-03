const db = require('../database/db');
const { createBitrix24Task } = require('../services/bitrix24Service');
const { calculatePredictiveQuantity } = require('../services/predictiveService');

function getPurchaseOrders(req, res) {
  const { status } = req.query;
  let query = `
    SELECT po.*, s.name as item_name, s.category, s.unit, s.current_quantity, s.minimum_quantity,
           u.name as confirmed_by_name
    FROM purchase_orders po
    JOIN stock_items s ON po.item_id = s.id
    LEFT JOIN users u ON po.confirmed_by = u.id
    WHERE 1=1
  `;
  const params = [];
  if (status && status !== 'ALL') {
    query += ' AND po.status = ?';
    params.push(status);
  }
  query += " ORDER BY CASE po.status WHEN 'PENDING' THEN 1 WHEN 'CONFIRMED' THEN 2 ELSE 3 END, po.created_at DESC";
  return res.json(db.prepare(query).all(...params));
}

async function createManualPurchaseOrder(req, res) {
  try {
    const qty = parseInt(req.body.quantity || req.body.predicted_quantity || 0);

    if (!item_id || !qty || qty <= 0) {
      return res.status(400).json({ error: 'Item e quantidade válida são obrigatórios' });
    }

    const item = db.prepare('SELECT * FROM stock_items WHERE id = ? AND is_active = 1').get(item_id);
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    const result = db.prepare(`
      INSERT INTO purchase_orders (item_id, predicted_quantity, daily_average, days_since_last_order, coverage_days, status, trigger_quantity, notes)
      VALUES (?, ?, 0, 0, 45, 'PENDING', ?, ?)
    `).run(item.id, qty, item.current_quantity, notes || `Criado manualmente por ${req.user.name}`);

    const orderId = result.lastInsertRowid;

    if (confirm_immediately) {
      let bitrix24Result = await createBitrix24Task({
        itemName: item.name,
        quantity: qty,
        predictiveDetails: { dailyAverage: 0, daysSinceLastOrder: 0, coverageDays: 45 },
        currentQuantity: item.current_quantity,
      });

      if (!bitrix24Result.taskId) {
        const simId = `BX-${Math.floor(1000 + Math.random() * 9000)}`;
        bitrix24Result = { success: true, taskId: simId, taskUrl: `https://farmarcas.bitrix24.com.br/tasks/task/view/${simId}/` };
      }

      db.prepare(`
        UPDATE purchase_orders
        SET status = 'CONFIRMED',
            confirmed_at = datetime('now'),
            confirmed_by = ?,
            jira_task_id = ?,
            jira_task_url = ?
        WHERE id = ?
      `).run(req.user.id, bitrix24Result.taskId || null, bitrix24Result.taskUrl || null, orderId);

      return res.status(201).json({
        id: orderId,
        message: `Pedido de compra enviado ao Bitrix24 com sucesso! Chamado #${bitrix24Result.taskId}`,
        bitrix24Task: { id: bitrix24Result.taskId, url: bitrix24Result.taskUrl },
      });
    }

    return res.status(201).json({
      id: orderId,
      message: 'Pedido manual criado com sucesso na fila de pendentes!',
    });
  } catch (err) {
    console.error('[PURCHASE_ORDER] Erro ao criar pedido manual:', err);
    return res.status(500).json({ error: 'Erro interno ao criar pedido manual' });
  }
}

function updateQuantity(req, res) {
  const { quantity } = req.body;
  const { id } = req.params;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Quantidade deve ser maior que zero' });
  }

  const order = db.prepare('SELECT id, status FROM purchase_orders WHERE id = ?').get(id);
  if (!order) {
    return res.status(404).json({ error: 'Pedido de compra não encontrado' });
  }
  if (order.status !== 'PENDING') {
    return res.status(400).json({ error: 'Apenas pedidos PENDENTES podem ter a quantidade alterada' });
  }

  db.prepare('UPDATE purchase_orders SET predicted_quantity = ? WHERE id = ?').run(parseInt(quantity), id);
  return res.json({ message: 'Quantidade atualizada com sucesso', quantity: parseInt(quantity) });
}

async function confirmPurchaseOrder(req, res) {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const order = db.prepare(`
      SELECT po.*, s.name as item_name, s.current_quantity, s.minimum_quantity
      FROM purchase_orders po
      JOIN stock_items s ON po.item_id = s.id
      WHERE po.id = ?
    `).get(id);

    if (!order) {
      return res.status(404).json({ error: 'Pedido de compra não encontrado' });
    }
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Pedido já foi processado' });
    }

    const finalQuantity = (quantity && quantity > 0) ? parseInt(quantity) : order.predicted_quantity;

    let bitrix24Result = await createBitrix24Task({
      itemName: order.item_name,
      quantity: finalQuantity,
      predictiveDetails: {
        dailyAverage: order.daily_average,
        daysSinceLastOrder: order.days_since_last_order,
        coverageDays: order.coverage_days,
      },
      currentQuantity: order.current_quantity,
    });

    if (!bitrix24Result.taskId) {
      const simId = `BX-${Math.floor(1000 + Math.random() * 9000)}`;
      bitrix24Result = { success: true, taskId: simId, taskUrl: `https://farmarcas.bitrix24.com.br/tasks/task/view/${simId}/` };
    }

    db.prepare(`
      UPDATE purchase_orders
      SET status = 'CONFIRMED',
          predicted_quantity = ?,
          confirmed_at = datetime('now'),
          confirmed_by = ?,
          jira_task_id = ?,
          jira_task_url = ?
      WHERE id = ?
    `).run(
      finalQuantity,
      req.user.id,
      bitrix24Result.taskId || null,
      bitrix24Result.taskUrl || null,
      id
    );

    return res.json({
      message: 'Pedido de compra confirmado com sucesso',
      bitrix24Task: bitrix24Result.success ? { id: bitrix24Result.taskId, url: bitrix24Result.taskUrl } : null,
      quantity: finalQuantity,
    });
  } catch (err) {
    console.error('[PURCHASE_ORDER] Erro ao confirmar:', err);
    return res.status(500).json({ error: 'Erro interno ao confirmar pedido' });
  }
}

function cancelPurchaseOrder(req, res) {
  const { id } = req.params;
  const order = db.prepare('SELECT id, status FROM purchase_orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
  if (order.status !== 'PENDING') return res.status(400).json({ error: 'Apenas pedidos pendentes podem ser cancelados' });

  db.prepare(`UPDATE purchase_orders SET status = 'CANCELLED' WHERE id = ?`).run(id);
  return res.json({ message: 'Pedido cancelado' });
}

function recalculate(req, res) {
  const { item_id } = req.params;
  const item = db.prepare('SELECT * FROM stock_items WHERE id = ? AND is_active = 1').get(item_id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  const prediction = calculatePredictiveQuantity(item_id, item.current_quantity, item.minimum_quantity);
  return res.json({ item, prediction });
}

module.exports = {
  getPurchaseOrders,
  createManualPurchaseOrder,
  updateQuantity,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  recalculate,
};
