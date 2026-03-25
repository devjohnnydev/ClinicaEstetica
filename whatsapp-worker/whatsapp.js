const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const path = require('path');

let sock = null;

async function connectToWhatsApp() {
    // A pasta `auth` vai armazenar os tokens de login. Persistência é crucial.
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth'));

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Override manual para imprimir um QR bonito
        logger: pino({ level: 'silent' }), // Silencia os logs imensos e barulhentos da LIB
        browser: ['Clinica Worker', 'Chrome', '10.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n[WhatsApp] Escaneie o QR Code abaixo para autenticar:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[WhatsApp] Conexão fechada. Reconectando=', shouldReconnect);
            
            if (shouldReconnect) {
                setTimeout(connectToWhatsApp, 5000); // Retry simples 
            } else {
                console.log('[WhatsApp] Desconectado Pelo Aparelho (Logged Out). Exclua a pasta auth/ e inicie o sistema novamente para gerar novo QR Code.');
            }
        } else if (connection === 'open') {
            console.log('[WhatsApp] ✓ Conectado com Sucesso! Aguardando agendamentos...');
        }
    });
}

function getSocket() {
    return sock;
}

async function sendWhatsAppMessage(jid, text) {
    if (!sock) throw new Error("Socket não inicializado");
    await sock.sendMessage(jid, { text });
}

module.exports = { connectToWhatsApp, getSocket, sendWhatsAppMessage };
