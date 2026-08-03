const fetch = require('node-fetch');

/**
 * Cria uma tarefa de compra no Bitrix24 via REST API
 * Variáveis de ambiente necessárias:
 *   BITRIX24_WEBHOOK_URL  - URL do webhook do Bitrix24 (ex: https://seudominio.bitrix24.com.br/rest/1/SEU_TOKEN/)
 *   BITRIX24_RESPONSIBLE_ID - ID do responsável pela tarefa (opcional, padrão: 1)
 *   BITRIX24_GROUP_ID       - ID do grupo/projeto Bitrix24 (opcional)
 */
async function createBitrix24Task({ itemName, quantity, predictiveDetails, currentQuantity }) {
    if (!process.env.BITRIX24_WEBHOOK_URL) {
        console.log('[BITRIX24] Webhook URL não configurada, pulando criação de tarefa');
        return { success: false, reason: 'bitrix24_not_configured' };
    }

    const responsibleId = parseInt(process.env.BITRIX24_RESPONSIBLE_ID) || 1;
    const groupId = process.env.BITRIX24_GROUP_ID ? parseInt(process.env.BITRIX24_GROUP_ID) : undefined;

    const descriptionText = [
        'Pedido de compra gerado automaticamente pelo Sistema de Gestão de Estoque de TI.',
        '',
        `Item: ${itemName}`,
        `Quantidade solicitada: ${quantity} unidade(s)`,
        `Estoque atual: ${currentQuantity} unidade(s)`,
        '',
        'Análise Preditiva:',
        `- Média de consumo diário: ${predictiveDetails.dailyAverage} unidade(s)/dia`,
        `- Dias desde o último pedido: ${predictiveDetails.daysSinceLastOrder} dias`,
        `- Cobertura projetada: ${predictiveDetails.coverageDays} dias`,
        '',
        'Pedido confirmado pela equipe de TI. Favor processar a compra.',
    ].join('\n');

    const fields = {
        TITLE: `[COMPRA] ${itemName} — ${quantity} unidade(s)`,
        DESCRIPTION: descriptionText,
        RESPONSIBLE_ID: responsibleId,
        PRIORITY: '2', // Alta prioridade
    };

    if (groupId) {
        fields.GROUP_ID = groupId;
    }

    const webhookBase = process.env.BITRIX24_WEBHOOK_URL.replace(/\/$/, '');
    const url = `${webhookBase}/tasks.task.add.json`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('[BITRIX24] Erro HTTP:', response.status, errText);
            return { success: false, reason: errText };
        }

        const data = await response.json();

        if (data.error) {
            console.error('[BITRIX24] Erro da API:', data.error, data.error_description);
            return { success: false, reason: data.error_description || data.error };
        }

        const taskId = data.result?.task?.id;
        const taskUrl = taskId
            ? `${new URL(webhookBase).origin}/company/personal/user/${responsibleId}/tasks/task/view/${taskId}/`
            : null;

        console.log(`[BITRIX24] Tarefa criada: #${taskId} - ${taskUrl}`);
        return { success: true, taskId: String(taskId), taskUrl };
    } catch (err) {
        console.error('[BITRIX24] Erro de conexão:', err.message);
        return { success: false, reason: err.message };
    }
}

module.exports = { createBitrix24Task };
