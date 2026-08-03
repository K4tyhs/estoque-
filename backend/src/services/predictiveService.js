const db = require('../database/db');

function calculatePredictiveQuantity(itemId, currentQuantity, minimumQuantity) {
  const config = db.prepare('SELECT coverage_days FROM automation_config WHERE id = 1').get();
  const coverageDays = config ? config.coverage_days : 45;

  // Find last confirmed purchase order for this item
  const lastOrder = db.prepare(`
    SELECT created_at FROM purchase_orders
    WHERE item_id = ? AND status = 'CONFIRMED'
    ORDER BY created_at DESC LIMIT 1
  `).get(itemId);

  const startDate = lastOrder
    ? new Date(lastOrder.created_at)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const daysSinceLastOrder = Math.max(
    (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    1
  );

  // Total outflow since last purchase
  const outflow = db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) as total
    FROM stock_movements
    WHERE item_id = ? AND type = 'OUT' AND created_at >= ?
  `).get(itemId, startDate.toISOString());

  const totalOut = outflow ? outflow.total : 0;
  const dailyAverage = totalOut / daysSinceLastOrder;
  const projectedNeeded = Math.ceil(dailyAverage * coverageDays);
  const quantityToOrder = Math.max(projectedNeeded - currentQuantity + minimumQuantity, minimumQuantity * 2);

  return {
    dailyAverage: dailyAverage.toFixed(3),
    totalOutSinceLastOrder: totalOut,
    daysSinceLastOrder: Math.round(daysSinceLastOrder),
    projectedNeeded,
    quantityToOrder,
    coverageDays,
    lastOrderDate: lastOrder ? lastOrder.created_at : null,
  };
}

module.exports = { calculatePredictiveQuantity };
