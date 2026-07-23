require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const db = require('./db');
const { initializeSchema } = require('./schema');

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  initializeSchema();
  console.log('\n🌱 Iniciando seed do banco de dados...\n');

  db.exec(`
    DELETE FROM stock_movements;
    DELETE FROM purchase_orders;
    DELETE FROM webhook_logs;
    DELETE FROM refresh_tokens;
    DELETE FROM authorized_emails;
    DELETE FROM users;
    DELETE FROM stock_items;
    DELETE FROM automation_config;
  `);

  db.prepare(`
    INSERT INTO automation_config (id, is_globally_active, coverage_days, email_alerts_active, jira_integration_active)
    VALUES (1, 0, 45, 0, 0)
  `).run();

  // Admin
  const adminHash = await bcrypt.hash('MASter@0102', 12);
  const adminResult = db.prepare(`
    INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)
  `).run('Administrador Master', 'admin@farmarcas.com.br', adminHash, 'ADMIN');
  const adminId = adminResult.lastInsertRowid;
  console.log('✅ Admin criado: admin@farmarcas.com.br / MASter@0102');

  // TI users
  const tiUsers = [
    { email: 'katiely.silva@farmarcas.com.br', name: 'Katiely Silva' },
    { email: 'ti@farmarcas.com.br', name: 'Equipe TI' },
  ];
  for (const u of tiUsers) {
    const h = await bcrypt.hash('TI@farmarcas2024', 12);
    db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`).run(u.name, u.email, h, 'TI');
    db.prepare(`INSERT INTO authorized_emails (email, role, name, created_by) VALUES (?, ?, ?, ?)`).run(u.email, 'TI', u.name, adminId);
  }
  console.log('✅ Usuários TI criados (senha: TI@farmarcas2024)');

  // Patrimônio users
  const patrimonioUsers = [
    { email: 'patrimonio@farmarcas.com.br', name: 'Equipe Patrimônio' },
    { email: 'compras@farmarcas.com.br', name: 'Compras Patrimônio' },
  ];
  for (const u of patrimonioUsers) {
    const h = await bcrypt.hash('Patrimonio@2024', 12);
    db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`).run(u.name, u.email, h, 'PATRIMONIO');
    db.prepare(`INSERT INTO authorized_emails (email, role, name, created_by) VALUES (?, ?, ?, ?)`).run(u.email, 'PATRIMONIO', u.name, adminId);
  }
  console.log('✅ Usuários Patrimônio criados (senha: Patrimonio@2024)');

  // Stock items
  const items = [
    { name: 'Pilha AA', category: 'Eletrônicos', description: 'Pilha alcalina AA 1.5V', unit: 'unidade', current_quantity: 3, minimum_quantity: 4 },
    { name: 'Headset USB', category: 'Periféricos', description: 'Headset com microfone USB', unit: 'unidade', current_quantity: 8, minimum_quantity: 5 },
    { name: 'Espuma de Fone', category: 'Acessórios', description: 'Almofada/espuma de reposição para headset', unit: 'par', current_quantity: 2, minimum_quantity: 6 },
    { name: 'Teclado USB', category: 'Periféricos', description: 'Teclado USB ABNT2', unit: 'unidade', current_quantity: 5, minimum_quantity: 3 },
    { name: 'Almofada de Mouse', category: 'Acessórios', description: 'Mousepad ergonômico', unit: 'unidade', current_quantity: 1, minimum_quantity: 4 },
    { name: 'Notebook Dell', category: 'Computadores', description: 'Notebook Dell Latitude (spare)', unit: 'unidade', current_quantity: 2, minimum_quantity: 2 },
    { name: 'Cabo HDMI 2m', category: 'Cabos', description: 'Cabo HDMI 2.0 2 metros', unit: 'unidade', current_quantity: 6, minimum_quantity: 4 },
    { name: 'Webcam HD', category: 'Periféricos', description: 'Webcam 1080p USB', unit: 'unidade', current_quantity: 4, minimum_quantity: 3 },
  ];

  const itemIds = [];
  for (const item of items) {
    const r = db.prepare(`
      INSERT INTO stock_items (name, category, description, unit, current_quantity, minimum_quantity)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(item.name, item.category, item.description, item.unit, item.current_quantity, item.minimum_quantity);
    itemIds.push(r.lastInsertRowid);
  }
  console.log('✅ 8 itens de estoque criados');

  const now = new Date();
  const requesters = ['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira', 'Carlos Lima'];
  const consumptionPatterns = [
    { itemIdx: 0, weeklyRate: 5, variance: 2 },
    { itemIdx: 1, weeklyRate: 2, variance: 1 },
    { itemIdx: 2, weeklyRate: 3, variance: 1 },
    { itemIdx: 3, weeklyRate: 1, variance: 1 },
    { itemIdx: 4, weeklyRate: 2, variance: 1 },
    { itemIdx: 5, weeklyRate: 0, variance: 0 },
    { itemIdx: 6, weeklyRate: 1, variance: 1 },
    { itemIdx: 7, weeklyRate: 1, variance: 0 },
  ];

  let movCount = 0;
  for (const p of consumptionPatterns) {
    const lastPurchaseDaysAgo = randomBetween(25, 45);
    const lastPurchaseDate = new Date(now);
    lastPurchaseDate.setDate(lastPurchaseDate.getDate() - lastPurchaseDaysAgo);

    const purchaseQty = randomBetween(10, 30);
    db.prepare(`
      INSERT INTO stock_movements (item_id, type, quantity, source, notes, created_by, created_at)
      VALUES (?, 'IN', ?, 'PURCHASE_CONFIRMED', 'Reposição de estoque aprovada', ?, ?)
    `).run(itemIds[p.itemIdx], purchaseQty, adminId, lastPurchaseDate.toISOString());

    db.prepare(`
      INSERT INTO purchase_orders (item_id, predicted_quantity, daily_average, days_since_last_order, coverage_days, status, confirmed_at, confirmed_by, created_at)
      VALUES (?, ?, ?, ?, 45, 'CONFIRMED', ?, ?, ?)
    `).run(itemIds[p.itemIdx], purchaseQty, (p.weeklyRate / 7).toFixed(2), lastPurchaseDaysAgo, lastPurchaseDate.toISOString(), adminId, lastPurchaseDate.toISOString());
    movCount++;

    const sources = ['JIRA_WEBHOOK', 'WHATSAPP_WEBHOOK', 'MANUAL'];
    for (let week = lastPurchaseDaysAgo; week > 0; week -= 7) {
      if (p.weeklyRate === 0 && Math.random() > 0.15) continue;
      const weeklyOut = p.weeklyRate > 0
        ? randomBetween(Math.max(0, p.weeklyRate - p.variance), p.weeklyRate + p.variance)
        : (Math.random() > 0.5 ? 1 : 0);
      if (weeklyOut <= 0) continue;

      const movDate = new Date(now);
      movDate.setDate(movDate.getDate() - week + randomBetween(0, 5));
      const src = sources[Math.floor(Math.random() * sources.length)];
      const ticketId = src !== 'MANUAL' ? `TI-${randomBetween(1000, 9999)}` : null;
      const requester = requesters[Math.floor(Math.random() * requesters.length)];

      db.prepare(`
        INSERT INTO stock_movements (item_id, type, quantity, source, ticket_id, requester, notes, created_at)
        VALUES (?, 'OUT', ?, ?, ?, ?, 'Saída via chamado', ?)
      `).run(itemIds[p.itemIdx], weeklyOut, src, ticketId, requester, movDate.toISOString());
      movCount++;
    }
  }

  // Pending purchase orders for critical items
  const criticals = [
    { idx: 0, qty: 31 },
    { idx: 2, qty: 18 },
    { idx: 4, qty: 14 },
  ];
  for (const c of criticals) {
    db.prepare(`
      INSERT INTO purchase_orders (item_id, predicted_quantity, daily_average, coverage_days, status, created_at)
      VALUES (?, ?, ?, 45, 'PENDING', ?)
    `).run(itemIds[c.idx], c.qty, (consumptionPatterns[c.idx].weeklyRate / 7).toFixed(2), now.toISOString());
  }

  // Some webhook logs
  const wlogs = [
    { source: 'JIRA', item_id: itemIds[0], qty: 2, ticket: 'TI-1042', requester: 'João Silva', status: 'SUCCESS', msg: 'Baixa realizada com sucesso' },
    { source: 'WHATSAPP', item_id: itemIds[1], qty: 1, ticket: 'WA-2024-001', requester: 'Maria Santos', status: 'SUCCESS', msg: 'Baixa realizada com sucesso' },
    { source: 'JIRA', item_id: itemIds[2], qty: 2, ticket: 'TI-1043', requester: 'Pedro Costa', status: 'SUCCESS', msg: 'Estoque abaixo do mínimo - email enviado' },
  ];
  for (const wl of wlogs) {
    const d = new Date(now); d.setDate(d.getDate() - randomBetween(1, 5));
    db.prepare(`
      INSERT INTO webhook_logs (source, payload, status, message, item_id, quantity_moved, ticket_id, requester, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(wl.source, JSON.stringify({ item_id: wl.item_id, quantity: wl.qty, ticket_id: wl.ticket, requester: wl.requester }), wl.status, wl.msg, wl.item_id, wl.qty, wl.ticket, wl.requester, d.toISOString());
  }

  console.log(`✅ ${movCount} movimentações históricas criadas`);
  console.log('✅ 3 pedidos de compra PENDENTES criados (itens críticos)');
  console.log('✅ 3 logs de webhook de exemplo criados');

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\n📋 Credenciais de acesso:');
  console.log('   👑 Admin:       admin@farmarcas.com.br        | MASter@0102');
  console.log('   💻 TI:          katiely.silva@farmarcas.com.br | TI@farmarcas2024');
  console.log('   💻 TI:          ti@farmarcas.com.br            | TI@farmarcas2024');
  console.log('   📦 Patrimônio:  patrimonio@farmarcas.com.br    | Patrimonio@2024');
  console.log('   📦 Patrimônio:  compras@farmarcas.com.br       | Patrimonio@2024');
  console.log('\n🚀 Próximo passo: npm run dev');
  process.exit(0);
}

seed().catch(err => { console.error('❌ Erro:', err); process.exit(1); });
