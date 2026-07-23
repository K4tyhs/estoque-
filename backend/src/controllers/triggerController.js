const db = require('../database/db');

function getConfig(req, res) {
  const config = db.prepare('SELECT * FROM automation_config WHERE id = 1').get();
  const items = db.prepare('SELECT id, name, category, current_quantity, minimum_quantity FROM stock_items WHERE is_active = 1 ORDER BY name').all();
  return res.json({ config, items });
}

function updateGlobalConfig(req, res) {
  const { is_globally_active, coverage_days, email_alerts_active, jira_integration_active } = req.body;
  db.prepare(`
    UPDATE automation_config
    SET is_globally_active = COALESCE(?, is_globally_active),
        coverage_days = COALESCE(?, coverage_days),
        email_alerts_active = COALESCE(?, email_alerts_active),
        jira_integration_active = COALESCE(?, jira_integration_active),
        updated_at = datetime('now'),
        updated_by = ?
    WHERE id = 1
  `).run(
    is_globally_active !== undefined ? (is_globally_active ? 1 : 0) : null,
    coverage_days || null,
    email_alerts_active !== undefined ? (email_alerts_active ? 1 : 0) : null,
    jira_integration_active !== undefined ? (jira_integration_active ? 1 : 0) : null,
    req.user.id
  );
  const updated = db.prepare('SELECT * FROM automation_config WHERE id = 1').get();
  return res.json({ message: 'Configuração atualizada', config: updated });
}

function updateItemMinimum(req, res) {
  const { minimum_quantity } = req.body;
  if (minimum_quantity === undefined || minimum_quantity < 0) {
    return res.status(400).json({ error: 'Quantidade mínima inválida' });
  }
  const item = db.prepare('SELECT id FROM stock_items WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  db.prepare(`UPDATE stock_items SET minimum_quantity = ?, updated_at = datetime('now') WHERE id = ?`).run(minimum_quantity, req.params.id);
  return res.json({ message: 'Limite mínimo atualizado' });
}

module.exports = { getConfig, updateGlobalConfig, updateItemMinimum };
