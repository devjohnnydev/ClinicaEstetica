# 🚀 WhatsApp Worker - Clínica Estética

Serviço em Node.js usando [Baileys](https://github.com/WhiskeySockets/Baileys) para disparar confirmações automáticas de agendamento via WhatsApp integrado diretamente com o FastAPI.

## 🛠️ Como Funciona
- Ele se loga simulando o WhatsApp Web com escaneamento de QR Code.
- Possui um Cronjob interno rodando a cada `10 minutos`.
- O Cronjob checa se estamos em horário comercial (`08h00 às 18h00`).
- Chama o endpoint do FastAPI (`GET /api/agenda/agendamentos/amanha`), e para cada agendamento envia a notificação no WhatsApp informando dia, hora e profissional.
- Bate no endpoint (`POST /api/agenda/agendamentos/marcar-enviado`) definindo a flag `confirmacao_enviada=true` para garantir que o cliente só receba uma única vez.

## 📦 Como Instalar e Rodar Localmente

1. Navegue até a pasta:
`cd whatsapp-worker`
2. Instale os pacotes:
`npm install`
3. Inicie o servidor:
`npm start`
4. O QR Code aparecerá no terminal. Pegue o celular com número `+55 11 95922-7430`, abra o WhatsApp > Aparelhos Conectados e **leia o QR Code**. A pasta `auth/` será gerada automaticamente, persistindo a sessão.

## ☁️ Deploy no Railway

O worker funciona perfeitamente de maneira Standalone no Railway. Siga as instruções estritas:

1. No seu **Painel do Railway**, crie um NOVO serviço clicando em **New > GitHub Repo** e aponte para o repositório deste mesmo projeto da Clínica.
2. Vá em **Settings > Service > Root Directory** e mude para a pasta `/whatsapp-worker`. Isso avisa ao Railway para ignorar o Python e usar o Node.js.
3. Crie um **Volume** no Railway chamado `whatsapp-auth-data` e atrele ele ao Mount Path `/app/auth`. **Isso é obrigatório** para que o Railway não delete a sessão Web do Baileys sempre que reiniciar.
4. Defina variáveis de ambiente (**Variables**):
   - `API_BASE_URL` = `https://SUA_API_PRODUCAO.up.railway.app/api/agenda`
   - `TZ` = `America/Sao_Paulo`
5. Uma vez em execução, clique no botão **View Logs** do worker. O **QR Code** vai ser printado no painel da nuvem. Rapidamente acesse com a câmera e efetue o login. A partir disto, o app passará a rodar para sempre verificando agendamentos.
