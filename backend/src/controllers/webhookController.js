const db = require('../database/db');
const { calculatePredictiveQuantity } = require('../services/predictiveService');
const { sendLowStockAlert } = require('../services/emailService');

async function processWebhook(req, res, source) {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  const incomingSecret = req.headers['x-webhook-secret'];

  if (webhookSecret && incomingSecret !== webhookSecret) {
    db.prepare(`
      INSERT INTO webhook_logs (source, payload, status, message) VALUES (?, ?, 'ERROR', ?)
    `).run(source, JSON.stringify(req.body), 'Token de autenticação inválido');
    return res.status(401).json({ error: 'Webhook secret inválido' });
  }

  const { item_id, quantity, requester, ticket_id, item_name } = req.body;

  if (!item_id || !quantity || quantity <= 0) {
    db.prepare(`
      INSERT INTO webhook_logs (source, payload, status, message) VALUES (?, ?, 'ERROR', ?)
    `).run(source, JSON.stringify(req.body), 'Campos obrigatórios ausentes: item_id, quantity');
    return res.status(400).json({ error: 'item_id e quantity são obrigatórios' });
  }

  const item = db.prepare('SELECT * FROM stock_items WHERE id = ? AND is_active = 1').get(item_id);
  if (!item) {
    db.prepare(`
      INSERT INTO webhook_logs (source, payload, status, message, item_id) VALUES (?, ?, 'ERROR', ?, ?)
    `).run(source, JSON.stringify(req.body), 'Item não encontrado', item_id);
    return res.status(404).json({ error: 'Item não encontrado' });
  }

  if (item.current_quantity < quantity) {
    db.prepare(`
      INSERT INTO webhook_logs (source, payload, status, message, item_id, quantity_moved, ticket_id, requester)
      VALUES (?, ?, 'IGNORED', ?, ?, ?, ?, ?)
    `).run(source, JSON.stringify(req.body), `Estoque insuficiente (${item.current_quantity} < ${quantity})`, item.id, quantity, ticket_id || null, requester || null);
    return res.status(200).json({ warning: 'Estoque insuficiente para dar baixa', currentQuantity: item.current_quantity });
  }

  const newQty = item.current_quantity - quantity;
  db.prepare(`UPDATE stock_items SET current_quantity = ?, updated_at = datetime('now') WHERE id = ?`).run(newQty, item.id);
  db.prepare(`
    INSERT INTO stock_movements (item_id, type, quantity, source, ticket_id, requester, notes)
    VALUES (?, 'OUT', ?, ?, ?, ?, ?)
  `).run(item.id, quantity, source === 'JIRA' ? 'JIRA_WEBHOOK' : source === 'WHATSAPP' ? 'WHATSAPP_WEBHOOK' : 'MANUAL', ticket_id || null, requester || null, `Baixa automática via ${source}`);

  let alertSent = false;
  let purchaseOrderId = null;
  const config = db.prepare('SELECT * FROM automation_config WHERE id = 1').get();

  if (newQty <= item.minimum_quantity && config && config.email_alerts_active) {
    const prediction = calculatePredictiveQuantity(item.id, newQty, item.minimum_quantity);
    const pendingOrder = db.prepare(`
      SELECT id FROM purchase_orders WHERE item_id = ? AND status = 'PENDING'
    `).get(item.id);

    if (!pendingOrder) {
      const poResult = db.prepare(`
        INSERT INTO purchase_orders (item_id, predicted_quantity, daily_average, days_since_last_order, coverage_days, trigger_quantity, status)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(item.id, prediction.quantityToOrder, prediction.dailyAverage, prediction.daysSinceLastOrder, prediction.coverageDays, newQty);
      purchaseOrderId = poResult.lastInsertRowid;

      await sendLowStockAlert({
        itemName: item.name,
        currentQuantity: newQty,
        minimumQuantity: item.minimum_quantity,
        predictedQuantity: prediction.quantityToOrder,
        dailyAverage: prediction.dailyAverage,
        daysSinceLastOrder: prediction.daysSinceLastOrder,
        coverageDays: prediction.coverageDays,
      });

      db.prepare(`UPDATE purchase_orders SET email_sent_at = datetime('now') WHERE id = ?`).run(purchaseOrderId);
      alertSent = true;
    }
  }

  db.prepare(`
    INSERT INTO webhook_logs (source, payload, status, message, item_id, quantity_moved, ticket_id, requester)
    VALUES (?, ?, 'SUCCESS', ?, ?, ?, ?, ?)
  `).run(
    source,
    JSON.stringify(req.body),
    alertSent ? `Baixa realizada. Estoque abaixo do mínimo - alerta enviado.` : `Baixa realizada com sucesso`,
    item.id, quantity, ticket_id || null, requester || null
  );

  return res.json({
    message: 'Baixa realizada com sucesso',
    itemName: item.name,
    previousQuantity: item.current_quantity,
    newQuantity: newQty,
    belowMinimum: newQty <= item.minimum_quantity,
    alertSent,
    purchaseOrderId,
  });
}

async function jiraWebhook(req, res) {
  return processWebhook(req, res, 'JIRA');
}

async function whatsappWebhook(req, res) {
  return processWebhook(req, res, 'WHATSAPP');
}

async function simulateWebhook(req, res) {
  const { source = 'MANUAL_SIM' } = req.body;
  // Build a synthetic req with headers so processWebhook can validate the secret
  const fakeReq = {
    headers: {
      ...(req.headers || {}),
      'x-webhook-secret': process.env.WEBHOOK_SECRET || '',
    },
    body: { ...req.body, source: undefined },
    user: req.user,
  };
  return processWebhook(fakeReq, res, source === 'WHATSAPP' ? 'WHATSAPP' : 'JIRA');
}

function getWebhookLogs(req, res) {
  const { limit = 50 } = req.query;
  const logs = db.prepare(`
    SELECT wl.*, s.name as item_name
    FROM webhook_logs wl
    LEFT JOIN stock_items s ON wl.item_id = s.id
    ORDER BY wl.created_at DESC
    LIMIT ?
  `).all(parseInt(limit));
  return res.json(logs);
}

module.exports = { jiraWebhook, whatsappWebhook, simulateWebhook, getWebhookLogs };
