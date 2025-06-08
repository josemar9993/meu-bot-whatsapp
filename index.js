process.on('uncaughtException', (err, origin) => {
  const fsSync = require('fs');
  const pathSync = require('path');
  console.error(`\n====== UNCAUGHT EXCEPTION ======\n`);
  console.error(`Timestamp: ${new Date().toISOString()}`);
  console.error(`Origem: ${origin}`);
  console.error(err);
  console.error(`\n==============================\n`);
  try {
    const logsDir = pathSync.join(__dirname, '../logs');
    if (!fsSync.existsSync(logsDir)) fsSync.mkdirSync(logsDir, { recursive: true });
    fsSync.appendFileSync(pathSync.join(logsDir, 'exceptions.log'), `[\${new Date().toISOString()}] Origin: \${origin}\\n\${err.stack || err}\\n\\n`);
  } catch (logErr) {
    console.error('Falha ao escrever no log de exceções síncrono:', logErr);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  const fsSync = require('fs');
  const pathSync = require('path');
  console.error(`\n====== UNHANDLED REJECTION ======\n`);
  console.error(`Timestamp: ${new Date().toISOString()}`);
  console.error('Motivo do Rejection:', reason);
  console.error(`\n===============================\n`);
  try {
    const logsDir = pathSync.join(__dirname, '../logs');
    if (!fsSync.existsSync(logsDir)) fsSync.mkdirSync(logsDir, { recursive: true });
    fsSync.appendFileSync(pathSync.join(logsDir, 'rejections.log'), `[\${new Date().toISOString()}] Reason: \${String(reason)}\\n\\n`);
  } catch (logErr) {
    console.error('Falha ao escrever no log de rejeições síncrono:', logErr);
  }
});

// require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); // Movido para baixo
const { Client, RemoteAuth } = require('whatsapp-web.js'); // ASSEGURE-SE QUE ESTA LINHA ESTÁ CORRETA
const { Storage } = require('@google-cloud/storage');

// SUBSTITUA 'coastal-hue-397109' SE O SEU ID DE PROJETO FOR DIFERENTE
const GCS_PROJECT_ID = 'coastal-hue-397109';
const GCS_BUCKET_NAME = 'bot-whatsapp-relatorio'; // Seu bucket no GCS
const GCS_SESSION_FILE_NAME = 'whatsapp-session.json';

const gcsStore = new Storage({
    projectId: GCS_PROJECT_ID,
});

const remoteAuthOptions = {
    store: {
        async save(data) {
            const file = gcsStore.bucket(GCS_BUCKET_NAME).file(GCS_SESSION_FILE_NAME);
            console.log(`Salvando sessão no GCS: gs://${GCS_BUCKET_NAME}/${GCS_SESSION_FILE_NAME}`);
            await file.save(JSON.stringify(data));
        },
        async retrieve() {
            try {
                const file = gcsStore.bucket(GCS_BUCKET_NAME).file(GCS_SESSION_FILE_NAME);
                console.log(`Recuperando sessão do GCS: gs://${GCS_BUCKET_NAME}/${GCS_SESSION_FILE_NAME}`);
                const [contents] = await file.download();
                return JSON.parse(contents.toString());
            } catch (error) {
                if (error.code === 404) {
                    console.log(`Arquivo de sessão não encontrado no GCS. Iniciando nova sessão.`);
                    return null;
                }
                console.error('Erro ao recuperar sessão do GCS:', error);
                throw error;
            }
        },
        async delete() {
            try {
                const file = gcsStore.bucket(GCS_BUCKET_NAME).file(GCS_SESSION_FILE_NAME);
                console.log(`Deletando sessão do GCS: gs://${GCS_BUCKET_NAME}/${GCS_SESSION_FILE_NAME}`);
                await file.delete();
            } catch (error) {
                if (error.code !== 404) {
                    console.error('Erro ao deletar sessão do GCS:', error);
                    throw error;
                }
            }
        }
    },
    backupSyncIntervalMs: 300000,
    dataPath: './auth_data_local_cache'
};

const client = new Client({
    authStrategy: new RemoteAuth(remoteAuthOptions),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
        // executablePath: '/usr/bin/google-chrome-stable' // Descomente se necessário no Docker
    }
});

client.on('qr', qr => {
    console.log('QR Code recebido, escaneie por favor. Verifique os logs do Cloud Run se estiver em produção.');
    // qrcodeTerminal.generate(qr, {small: true}); // Para exibir no terminal
});

client.on('authenticated', () => {
    console.log('Cliente autenticado!');
});

client.on('auth_failure', msg => {
    console.error('Falha na autenticação:', msg);
});

client.on('ready', () => {
    console.log('Cliente do WhatsApp está pronto!');
});

// ...seu código de manipulação de mensagens e outras lógicas do bot...
// Exemplo:
// client.on('message', msg => {
//   if (msg.body == '!ping') {
//     msg.reply('pong');
//   }
// });

client.initialize().catch(err => {
    console.error("Erro ao inicializar o cliente:", err);
});

// Se você tiver um servidor Express para health checks ou outras rotas:
// const express = require('express');
// const app = express();
// const port = process.env.PORT || 8080;
// app.get('/', (req, res) => {
//   res.send('Bot WhatsApp está rodando!');
// });
// app.listen(port, () => {
//   console.log(`Servidor ouvindo na porta ${port}`);
// });