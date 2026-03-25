const crypto = require('crypto');
if (!global.crypto) {
    global.crypto = crypto.webcrypto || crypto;
}

const { connectToWhatsApp } = require('./whatsapp');
const { startScheduler } = require('./scheduler');

async function bootstrap() {
    console.log("==========================================");
    console.log("🚀 Iniciando Worker de WhatsApp (Baileys)");
    console.log("==========================================");

    // 1. Inicia conexão Baileys e QR Code
    await connectToWhatsApp();

    // 2. Inicia Cronjob (Roda a cada 10 min checando horário comercial)
    startScheduler();

    // Impede o worker de fechar no primeiro erro isolado
    process.on('uncaughtException', (err) => {
        console.error('[Erro Fatal Evitado]', err);
    });
    process.on('unhandledRejection', (err) => {
        console.error('[Rejeição não tratada]', err);
    });
}

bootstrap();
