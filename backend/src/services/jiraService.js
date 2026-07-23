const fetch = require('node-fetch');

async function createJiraTask({ itemName, quantity, predictiveDetails, currentQuantity }) {
  if (!process.env.JIRA_URL || !process.env.JIRA_USER || !process.env.JIRA_TOKEN) {
    console.log('[JIRA] Credenciais não configuradas, pulando criação de tarefa');
    return { success: false, reason: 'jira_not_configured' };
  }

  const projectKey = process.env.JIRA_PROJECT_KEY || 'TI';
  const auth = Buffer.from(`${process.env.JIRA_USER}:${process.env.JIRA_TOKEN}`).toString('base64');

  const descriptionText = [
    `Pedido de compra gerado automaticamente pelo Sistema de Gestão de Estoque TI.`,
    ``,
    `Item: ${itemName}`,
    `Quantidade sugerida: ${quantity} unidade(s)`,
    `Estoque atual: ${currentQuantity} unidade(s)`,
    ``,
    `Análise Preditiva:`,
    `- Média de consumo diário: ${predictiveDetails.dailyAverage} unidade(s)/dia`,
    `- Dias desde o último pedido: ${predictiveDetails.daysSinceLastOrder} dias`,
    `- Cobertura projetada: ${predictiveDetails.coverageDays} dias`,
    ``,
    `Pedido confirmado pela equipe de TI. Favor processar a compra.`,
  ].join('\n');

  const body = {
    fields: {
      project: { key: projectKey },
      summary: `[COMPRA] ${itemName} - ${quantity} unidade(s)`,
      description: {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: descriptionText }],
        }],
      },
      issuetype: { name: 'Task' },
      priority: { name: 'High' },
    },
  };

  try {
    const response = await fetch(`${process.env.JIRA_URL}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[JIRA] Erro:', errText);
      return { success: false, reason: errText };
    }

    const data = await response.json();
    const taskUrl = `${process.env.JIRA_URL}/browse/${data.key}`;
    console.log(`[JIRA] Tarefa criada: ${data.key} - ${taskUrl}`);
    return { success: true, taskId: data.key, taskUrl };
  } catch (err) {
    console.error('[JIRA] Erro de conexão:', err.message);
    return { success: false, reason: err.message };
  }
}

module.exports = { createJiraTask };
