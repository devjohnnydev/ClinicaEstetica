const cron = require('node-cron');
const axios = require('axios');
const { getSocket, sendWhatsAppMessage } = require('./whatsapp');
const { formatWhatsAppNumber, isBusinessHours, getBRTime } = require('./utils');

// URL da API local em Docker Compose ou produção da web.
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:8000/api/agenda';

async function processAppointments() {
    console.log(`\n[CRON] Verificando novos agendamentos: ${getBRTime().toLocaleString('pt-BR')}...`);
    
    if (!isBusinessHours()) {
        console.log('[CRON] Fora do horário comercial (08h - 18h). Bloqueando envios noturnos.');
        return;
    }

    const sock = getSocket();
    if (!sock || !sock.user) {
        console.log('[CRON] WhatsApp Módulo WebAinda Não Autenticado/Sincronizando...');
        return;
    }

    try {
        console.log(`[API] Buscando agendamentos de amanhã de -> ${API_BASE_URL}`);
        
        // Colocando um timeout para a API não travar a rotina
        const res = await axios.get(`${API_BASE_URL}/agendamentos/amanha`, { timeout: 15000 });
        const agendamentos = res.data;

        if (!Array.isArray(agendamentos) || agendamentos.length === 0) {
            console.log('[API] Nenhum agendamento pendente de envio automático encontrado.');
            return;
        }

        console.log(`[API] Achei ${agendamentos.length} agendamento(s) não notificados. Formatando...`);

        for (const ag of agendamentos) {
            if (ag.confirmacao_enviada) continue; // Dupla-verificação do laço

            const jid = formatWhatsAppNumber(ag.telefone);
            if (!jid) {
                console.log(`[WhatsApp] Ignorando id-${ag.id}: Telefone vazio ou inválido (${ag.telefone})`);
                continue;
            }

            const message = `Olá, ${ag.nome_cliente}! Tudo bem?

Estamos passando para confirmar seu agendamento conosco:

📅 Data: ${ag.data_agendamento.split('-').reverse().join('/')}
⏰ Horário: ${ag.hora_agendamento}
👤 Profissional: ${ag.profissional}
💼 Procedimento: ${ag.procedimento}

Está tudo certo para o nosso horário de amanhã?

Ficamos à disposição.`;

            try {
                // Tenta notificar WhatsApp primeiro
                await sendWhatsAppMessage(jid, message);
                console.log(`[WhatsApp] ✓ MSG enviada: Alvo ${ag.nome_cliente} (${jid})`);

                // Depois atualiza no BackEnd Python
                await axios.post(`${API_BASE_URL}/agendamentos/marcar-enviado`, { id: ag.id }, { timeout: 10000 });
                console.log(`[API] ✓ id-${ag.id} marcou flag -> confirmacao_enviada=true`);

                // Rate limiting simples de 4 segundos pra humanizar cliques 
                await new Promise(r => setTimeout(r, 4000));
            } catch (err) {
                console.error(`[Erro] Falha ao enviar agendamento ${ag.id}:`, err.message);
                
                // Se a falha foi porque o número não existe, bloqueou a gente, ou deu TimeOut Eterno
                // Temos que avisar a API que nós processamos, senão ele vai travar a lista de envios eternamente
                try {
                    console.log(`[API] ⚠️ Marcando id-${ag.id} como enviado forçadamente para pular da fila...`);
                    await axios.post(`${API_BASE_URL}/agendamentos/marcar-enviado`, { id: ag.id }, { timeout: 10000 });
                } catch (e) {
                    console.error('[Erro] Não conseguiu nem forçar a baixa na API!', e.message);
                }
            }
        }
    } catch (err) {
        console.error('[CRON] Endpoint FastAPI falhou ou timeout excedido:', err.message);
    }
}

function startScheduler() {
    // 08h-18h a cada 10 minutos
    cron.schedule('*/10 * * * *', () => {
        processAppointments();
    });
    console.log('[Scheduler] CRON armado. Batimento a cada 10 min.');
    
    // Roda uma vez quase de imediato pro Dev ver funcionando (depois de 15seg esperando logar QR)
    setTimeout(processAppointments, 15000);
}

module.exports = { startScheduler };
