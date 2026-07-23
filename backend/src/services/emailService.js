const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendLowStockAlert({ itemName, currentQuantity, minimumQuantity, predictedQuantity, dailyAverage, daysSinceLastOrder, coverageDays }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[EMAIL] Alerta de estoque baixo para ${itemName} (email não configurado, apenas log)`);
    return { success: false, reason: 'email_not_configured' };
  }

  const transporter = createTransporter();
  const tiEmail = process.env.EMAIL_TI || 'ti@farmarcas.com.br';

  const html = `
  <!DOCTYPE html>
  <html>
  <head><style>
    body { font-family: Inter, Arial, sans-serif; background: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #141414; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #ff6b00, #ff8c00); padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; color: white; }
    .body { padding: 30px; }
    .alert-card { background: #1c1c1c; border: 2px solid #ff6b00; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .stat { display: inline-block; text-align: center; margin: 10px 20px; }
    .stat .value { font-size: 32px; font-weight: bold; color: #ff6b00; }
    .stat .label { font-size: 12px; color: #a0a0a0; text-transform: uppercase; }
    .predict-box { background: #0d2233; border: 1px solid #1a4a7a; border-radius: 8px; padding: 16px; margin-top: 16px; }
    .predict-box h3 { color: #60b4ff; margin: 0 0 12px 0; }
    .cta-btn { display: block; text-align: center; background: #ff6b00; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 24px 0; }
    .footer { padding: 20px; text-align: center; color: #555; font-size: 12px; border-top: 1px solid #222; }
  </style></head>
  <body>
    <div class="container">
      <div class="header">
        <h1>⚠️ Alerta de Estoque Baixo</h1>
        <p style="margin:8px 0 0; color:#ffe0c0;">Sistema de Gestão Preditiva de Estoque · TI Farmarcas</p>
      </div>
      <div class="body">
        <div class="alert-card">
          <h2 style="margin:0 0 16px; font-size:20px;">${itemName}</h2>
          <div>
            <div class="stat">
              <div class="value" style="color:#ef4444;">${currentQuantity}</div>
              <div class="label">Quantidade Atual</div>
            </div>
            <div class="stat">
              <div class="value" style="color:#ff6b00;">${minimumQuantity}</div>
              <div class="label">Estoque Mínimo</div>
            </div>
            <div class="stat">
              <div class="value" style="color:#22c55e;">${predictedQuantity}</div>
              <div class="label">Qtd Sugerida</div>
            </div>
          </div>
        </div>
        <div class="predict-box">
          <h3>📊 Análise Preditiva</h3>
          <p style="color:#ccc; margin:4px 0;">• Média de consumo diário: <strong style="color:#fff;">${Number(dailyAverage).toFixed(2)} unidade(s)/dia</strong></p>
          <p style="color:#ccc; margin:4px 0;">• Dias desde o último pedido: <strong style="color:#fff;">${daysSinceLastOrder} dias</strong></p>
          <p style="color:#ccc; margin:4px 0;">• Cobertura projetada: <strong style="color:#fff;">${coverageDays} dias</strong></p>
          <p style="color:#ccc; margin:4px 0;">• Quantidade calculada para repor: <strong style="color:#60b4ff;">${predictedQuantity} unidade(s)</strong></p>
        </div>
        <p style="color:#a0a0a0; margin-top: 20px;">Acesse o painel do sistema para confirmar o pedido de compra e abrir a tarefa no JIRA automaticamente.</p>
        <a href="http://localhost:5173" class="cta-btn">Acessar Painel e Confirmar Pedido →</a>
      </div>
      <div class="footer">Sistema de Estoque TI · Farmarcas · ${new Date().getFullYear()}</div>
    </div>
  </body>
  </html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Sistema Estoque TI <noreply@farmarcas.com.br>',
      to: tiEmail,
      subject: `⚠️ Estoque Baixo: ${itemName} (${currentQuantity} restante${currentQuantity !== 1 ? 's' : ''})`,
      html,
    });
    console.log(`[EMAIL] Alerta enviado para ${tiEmail}: ${itemName}`);
    return { success: true };
  } catch (err) {
    console.error('[EMAIL] Erro ao enviar:', err.message);
    return { success: false, reason: err.message };
  }
}

module.exports = { sendLowStockAlert };
