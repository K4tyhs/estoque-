const db = require('../database/db');
const { checkAndTriggerAlert } = require('../services/alertService');

function getItems(req, res) {
  const items = db.prepare(`
    SELECT s.*,
      CASE
        WHEN s.current_quantity <= 0 THEN 'CRITICAL'
        WHEN s.current_quantity <= s.minimum_quantity THEN 'ALERT'
        ELSE 'NORMAL'
      END as status,
      (SELECT COUNT(*) FROM purchase_orders po WHERE po.item_id = s.id AND po.status = 'PENDING') as pending_orders
    FROM stock_items s
    WHERE s.is_active = 1
    ORDER BY s.category, s.name
  `).all();
  return res.json(items);
}

function getItemById(req, res) {
  const item = db.prepare(`
    SELECT s.*,
      CASE
        WHEN s.current_quantity <= 0 THEN 'CRITICAL'
        WHEN s.current_quantity <= s.minimum_quantity THEN 'ALERT'
        ELSE 'NORMAL'
      END as status
    FROM stock_items s WHERE s.id = ? AND s.is_active = 1
  `).get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  return res.json(item);
}

function createItem(req, res) {
  const { name, category, description, unit, current_quantity, minimum_quantity } = req.body;
  if (!name || !category) return res.status(400).json({ error: 'Nome e categoria são obrigatórios' });
  const result = db.prepare(`
    INSERT INTO stock_items (name, category, description, unit, current_quantity, minimum_quantity)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, category, description || null, unit || 'unidade', current_quantity || 0, minimum_quantity || 1);
  return res.status(201).json({ id: result.lastInsertRowid, message: 'Item criado com sucesso' });
}

function updateItem(req, res) {
  const { name, category, description, unit, current_quantity, minimum_quantity } = req.body;
  const item = db.prepare('SELECT * FROM stock_items WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  db.prepare(`
    UPDATE stock_items SET 
      name = ?, 
      category = ?,
      description = ?, 
      unit = ?,
      current_quantity = ?,
      minimum_quantity = ?, 
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name !== undefined ? name : item.name,
    category !== undefined ? category : item.category,
    description !== undefined ? description : item.description,
    unit !== undefined ? unit : item.unit,
    current_quantity !== undefined ? current_quantity : item.current_quantity,
    minimum_quantity !== undefined ? minimum_quantity : item.minimum_quantity,
    req.params.id
  );

  // Trigger alert if applicable (async, don't block response)
  const targetQty = current_quantity !== undefined ? current_quantity : item.current_quantity;
  checkAndTriggerAlert(req.params.id, targetQty).catch(err => console.error('Erro ao verificar alerta pós-update:', err));

  return res.json({ message: 'Item atualizado' });
}

function deleteItem(req, res) {
  const item = db.prepare('SELECT id FROM stock_items WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  db.prepare(`UPDATE stock_items SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  return res.json({ message: 'Item removido' });
}

function manualMove(req, res) {
  const { type, quantity, notes } = req.body;
  if (!type || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Tipo (IN/OUT) e quantidade são obrigatórios' });
  }
  if (!['IN', 'OUT'].includes(type)) {
    return res.status(400).json({ error: 'Tipo deve ser IN ou OUT' });
  }

  const item = db.prepare('SELECT * FROM stock_items WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  if (type === 'OUT' && item.current_quantity < quantity) {
    return res.status(400).json({ error: `Estoque insuficiente. Disponível: ${item.current_quantity}` });
  }

  const newQty = type === 'IN' ? item.current_quantity + quantity : item.current_quantity - quantity;
  db.prepare(`UPDATE stock_items SET current_quantity = ?, updated_at = datetime('now') WHERE id = ?`).run(newQty, item.id);
  db.prepare(`
    INSERT INTO stock_movements (item_id, type, quantity, source, notes, created_by)
    VALUES (?, ?, ?, 'MANUAL', ?, ?)
  `).run(item.id, type, quantity, notes || null, req.user.id);

  // Trigger alert if OUT (async, don't block response)
  if (type === 'OUT') {
    checkAndTriggerAlert(item.id, newQty, true).catch(err => console.error('Erro ao verificar alerta pós-move:', err));
  }

  return res.json({ message: 'Movimentação registrada', newQuantity: newQty });
}

function getMovements(req, res) {
  const { item_id, limit = 50 } = req.query;
  let query = `
    SELECT m.*, s.name as item_name, u.name as user_name
    FROM stock_movements m
    LEFT JOIN stock_items s ON m.item_id = s.id
    LEFT JOIN users u ON m.created_by = u.id
    WHERE 1=1
  `;
  const params = [];
  if (item_id) { query += ' AND m.item_id = ?'; params.push(item_id); }
  query += ' ORDER BY m.created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  return res.json(db.prepare(query).all(...params));
}

async function triggerAllAlerts(req, res) {
  try {
    const items = db.prepare(`
      SELECT * FROM stock_items 
      WHERE current_quantity <= minimum_quantity AND is_active = 1
    `).all();

    if (items.length === 0) {
      return res.json({ message: 'Nenhum item com estoque baixo no momento.' });
    }

    const { calculatePredictiveQuantity } = require('../services/predictiveService');
    const { sendLowStockAlert } = require('../services/emailService');

    const results = [];

    for (const item of items) {
      const prediction = calculatePredictiveQuantity(item.id, item.current_quantity, item.minimum_quantity);
      
      const pendingOrder = db.prepare(`
        SELECT id FROM purchase_orders WHERE item_id = ? AND status = 'PENDING'
      `).get(item.id);

      let purchaseOrderId = pendingOrder ? pendingOrder.id : null;
      if (!pendingOrder) {
        const poResult = db.prepare(`
          INSERT INTO purchase_orders (item_id, predicted_quantity, daily_average, days_since_last_order, coverage_days, trigger_quantity, status)
          VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
        `).run(item.id, prediction.quantityToOrder, prediction.dailyAverage, prediction.daysSinceLastOrder, prediction.coverageDays, item.current_quantity);
        purchaseOrderId = poResult.lastInsertRowid;
      }

      const emailRes = await sendLowStockAlert({
        itemName: item.name,
        currentQuantity: item.current_quantity,
        minimumQuantity: item.minimum_quantity,
        predictedQuantity: prediction.quantityToOrder,
        dailyAverage: prediction.dailyAverage,
        daysSinceLastOrder: prediction.daysSinceLastOrder,
        coverageDays: prediction.coverageDays,
      });

      if (emailRes.success) {
        db.prepare(`UPDATE purchase_orders SET email_sent_at = datetime('now') WHERE id = ?`).run(purchaseOrderId);
      }

      results.push({
        itemName: item.name,
        currentQuantity: item.current_quantity,
        minimumQuantity: item.minimum_quantity,
        emailSent: emailRes.success,
        reason: emailRes.reason || null
      });
    }

    return res.json({ message: 'Processamento de alertas concluído', results });
  } catch (err) {
    console.error('Erro ao disparar alertas:', err);
    return res.status(500).json({ error: 'Erro interno ao processar alertas de e-mail.' });
  }
}

module.exports = { getItems, getItemById, createItem, updateItem, deleteItem, manualMove, getMovements, triggerAllAlerts };
