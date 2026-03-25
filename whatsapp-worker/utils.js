/**
 * Remove formatações de um número e converte para padrão corporativo
 * Ex: (11) 95922-7430 -> 5511959227430@s.whatsapp.net
 */
function formatWhatsAppNumber(phone) {
    if (!phone) return null;
    let clean = phone.replace(/\D/g, '');
    
    // Assumir ddd do Brasil se for tamanho comum
    if (clean.length === 10 || clean.length === 11) {
        clean = '55' + clean;
    }
    
    return `${clean}@s.whatsapp.net`;
}

function getBRTime() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

function isBusinessHours() {
    const now = getBRTime();
    const hours = now.getHours();
    return hours >= 8 && hours < 18;
}

module.exports = { formatWhatsAppNumber, getBRTime, isBusinessHours };
