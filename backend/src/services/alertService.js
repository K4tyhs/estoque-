const db = require('../database/db');
const { calculatePredictiveQuantity } = require('./predictiveService');
const { sendLowStockAlert } = require('./emailService');

async function checkAndTriggerAlert(itemId, currentQty, isOutMovement = false) {
  const item = db.prepare('SELECT * FROM stock_items WHERE id = ? AND is_active = 1').get(itemId);
  if (!item) return null;

  const config = db.prepare('SELECT * FROM automation_config WHERE id = 1').get();
  if (!config || !config.email_alerts_active) return null;

  const actualQty = currentQty !== undefined ? currentQty : item.current_quantity;

  if (actualQty <= item.minimum_quantity && actualQty > 0) {
    const pendingOrder = db.prepare(`
      SELECT id FROM purchase_orders WHERE item_id = ? AND status = 'PENDING'
    `).get(item.id);

    // Envia o e-mail caso não exista pedido pendente OU se for uma movimentação de saída (OUT) de um item crítico
    if (!pendingOrder || isOutMovement) {
      const prediction = calculatePredictiveQuantity(item.id, actualQty, item.minimum_quantity);
      
      let purchaseOrderId;
      if (!pendingOrder) {
        const poResult = db.prepare(`
          INSERT INTO purchase_orders (item_id, predicted_quantity, daily_average, days_since_last_order, coverage_days, trigger_quantity, status)
          VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
        `).run(item.id, prediction.quantityToOrder, prediction.dailyAverage, prediction.daysSinceLastOrder, prediction.coverageDays, actualQty);
        purchaseOrderId = poResult.lastInsertRowid;
      } else {
        purchaseOrderId = pendingOrder.id;
        db.prepare(`
          UPDATE purchase_orders 
          SET predicted_quantity = ?, daily_average = ?, days_since_last_order = ?, coverage_days = ?, trigger_quantity = ?
          WHERE id = ?
        `).run(prediction.quantityToOrder, prediction.dailyAverage, prediction.daysSinceLastOrder, prediction.coverageDays, actualQty, purchaseOrderId);
      }

      const emailRes = await sendLowStockAlert({
        itemName: item.name,
        currentQuantity: actualQty,
        minimumQuantity: item.minimum_quantity,
        predictedQuantity: prediction.quantityToOrder,
        dailyAverage: prediction.dailyAverage,
        daysSinceLastOrder: prediction.daysSinceLastOrder,
        coverageDays: prediction.coverageDays,
      });

      if (emailRes.success) {
        db.prepare(`UPDATE purchase_orders SET email_sent_at = datetime('now') WHERE id = ?`).run(purchaseOrderId);
      }
      return { triggered: true, purchaseOrderId, emailSent: emailRes.success, reason: emailRes.reason };
    }
  }
  return { triggered: false };
}

module.exports = { checkAndTriggerAlert };
