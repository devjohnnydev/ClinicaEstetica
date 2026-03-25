const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

let sock = null;

async function connectToWhatsApp() {
    if (sock) {
        sock.ev.removeAllListeners('connection.update');
        sock.ev.removeAllListeners('creds.update');
    }

    const authPath = path.join(__dirname, 'auth');
    if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });

    // A pasta `auth` vai armazenar os tokens de login. Persistência é crucial.
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[WhatsApp] Versão do WhatsApp Web v${version.join('.')} (Última: ${isLatest})`);

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // Override manual para imprimir um QR bonito
        logger: pino({ level: 'silent' }), // Silencia os logs imensos e barulhentos da LIB
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n[WhatsApp] Escaneie o QR Code abaixo para autenticar:');
            qrcode.generate(qr, { small: true });
            
            console.log('\n======================================================');
            console.log('⚠️ SE O QR CODE ACIMA ESTIVER ESTICADO/DEFORMADO NO RAILWAY:');
            console.log('CLIQUE NO LINK ABAIXO para abrir a imagem perfeita do QR Code:');
            
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
            console.log('\n➜ ' + qrImageUrl + '\n');
            
            console.log('Apenas abra esse link no seu navegador, pegue o WhatsApp do seu celular, e escaneie a imagem que aparecer na tela.');
            console.log('======================================================\n');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[WhatsApp] Conexão fechada: ${lastDisconnect?.error?.message} | Reconectando=`, shouldReconnect);
            
            if (shouldReconnect) {
                console.log('[WhatsApp] Aguardando 5s para restaurar...');
                setTimeout(() => connectToWhatsApp(), 5000); // Retry simples 
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
