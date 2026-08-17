const db = require('./db');

function initializeSchema() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'TI', 'PATRIMONIO')),
      is_active INTEGER NOT NULL DEFAULT 1,
      password_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
      reset_token TEXT,
      reset_token_expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS authorized_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('TI', 'PATRIMONIO', 'ADMIN')),
      name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS access_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'TI',
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      processed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS stock_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      unit TEXT NOT NULL DEFAULT 'unidade',
      current_quantity INTEGER NOT NULL DEFAULT 0,
      minimum_quantity INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES stock_items(id),
      type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
      quantity INTEGER NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('MANUAL', 'JIRA_WEBHOOK', 'WHATSAPP_WEBHOOK', 'PURCHASE_CONFIRMED')),
      ticket_id TEXT,
      requester TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES stock_items(id),
      predicted_quantity INTEGER NOT NULL,
      daily_average REAL,
      days_since_last_order INTEGER,
      coverage_days INTEGER NOT NULL DEFAULT 45,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
      trigger_quantity INTEGER,
      email_sent_at TEXT,
      jira_task_id TEXT,
      jira_task_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      confirmed_at TEXT,
      confirmed_by INTEGER REFERENCES users(id),
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS automation_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      is_globally_active INTEGER NOT NULL DEFAULT 0,
      coverage_days INTEGER NOT NULL DEFAULT 45,
      email_alerts_active INTEGER NOT NULL DEFAULT 0,
      jira_integration_active INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS webhook_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL CHECK(source IN ('JIRA', 'WHATSAPP', 'MANUAL_SIM')),
      payload TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'ERROR', 'IGNORED')),
      message TEXT,
      item_id INTEGER REFERENCES stock_items(id),
      quantity_moved INTEGER,
      ticket_id TEXT,
      requester TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

    const config = db.prepare('SELECT id FROM automation_config WHERE id = 1').get();
    if (!config) {
        db.prepare(`
      INSERT INTO automation_config (id, is_globally_active, coverage_days, email_alerts_active, jira_integration_active)
      VALUES (1, 0, 45, 0, 0)
    `).run();
    }

    // Atualiza base de dados existente para incluir novas colunas de expiração de senha
    try {
        db.exec("ALTER TABLE users ADD COLUMN password_changed_at TEXT NOT NULL DEFAULT (datetime('now'))");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE users ADD COLUMN reset_token TEXT");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE users ADD COLUMN reset_token_expires_at TEXT");
    } catch (e) {}

    console.log('✅ Schema inicializado');
}

module.exports = { initializeSchema };
