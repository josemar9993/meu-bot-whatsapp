// src/emailer.js

// Importações necessárias
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');

/**
 * Configura o transportador de e-mail (Gmail) com base nas variáveis de ambiente.
 * - EMAIL_USER: email remetente (ex.: seu_usuario@gmail.com)
 * - EMAIL_PASSWORD: senha de aplicativo do Google (NÃO a senha normal)
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Gera e envia o resumo diário completo por e-mail.
 * 
 * @param {Object} chats  Mesmo objeto de chats usado no summarizer.js
 */
async function sendDailySummary(chats) {
  const { generateSummary } = require('./summarizer');
  if (!Array.isArray(chats)) {
    console.warn('O parâmetro chats não é um array. O e-mail não será enviado.');
    return;
  }
  if (chats.length === 0) {
    console.warn('Nenhuma mensagem encontrada. Gerando análise vazia.');
  }
  const resumoTexto = await generateSummary(chats);

  // Adicione esta linha para visualizar no terminal:
  console.log(resumoTexto);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO,
    subject: '📋 Resumo Diário de Conversas',
    text: resumoTexto
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email de resumo diário enviado com sucesso!');
  } catch (error) {
    console.error('Erro ao enviar o email:', error);
  }
}

/**
 * Gera e envia o resumo apenas de pendências por e-mail.
 * 
 * @param {Object} chats
 */
async function sendPendingSummary(chats) {
  const { generateSummary } = require('./summarizer');
  const resumoTexto = await generateSummary(chats);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO,
    subject: '⏳ Resumo de Pendências (Hoje às 23h)',
    text: resumoTexto
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email de pendências enviado com sucesso!');
  } catch (error) {
    console.error('Erro ao enviar o email de pendências:', error);
  }
}

/**
 * Função de teste para enviar um e-mail de resumo diário.
 */
async function testEmail() {
  const testChats = [
    { id: 'chat1', messages: ['Mensagem 1', 'Mensagem 2'] },
    { id: 'chat2', messages: ['Mensagem 3', 'Mensagem 4'] }
  ];

  await sendDailySummary(testChats);
}

/**
 * Carrega as conversas de um dia específico (formato: YYYY-MM-DD).
 * Supondo que cada dia esteja em um arquivo src/chats_salvos/chats-YYYY-MM-DD.json
 */
function loadChatsByDate(dateStr) {
  const filePath = path.resolve(__dirname, `./chats_salvos/chats-${dateStr}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(data)) {
        console.log(`Carregado ${data.length} mensagens de ${filePath}`);
        return data;
      }
      console.error('O arquivo não contém um array de mensagens válido.');
      return [];
    } catch (e) {
      console.error('Erro ao ler o arquivo JSON:', e.message);
      return [];
    }
  }
  console.warn(`Arquivo não encontrado: ${filePath}`);
  return [];
}

/**
 * Envia o resumo das conversas de um dia específico por e-mail.
 * @param {string} dateStr - Data no formato YYYY-MM-DD
 */
async function sendSummaryForDate(dateStr) {
  const chats = loadChatsByDate(dateStr);
  if (!chats || chats.length === 0) {
    console.log(`Nenhuma conversa encontrada para ${dateStr}`);
    return;
  }
  await sendDailySummary(chats);
}

// Exemplo de uso prático: enviar o resumo do dia atual
if (require.main === module) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  sendSummaryForDate(today);
}

// Teste manual: apenas imprimir o resumo do arquivo de hoje no terminal
if (require.main === module) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const chats = loadChatsByDate(today);
  if (!chats || chats.length === 0) {
    console.log(`Nenhuma conversa encontrada para ${today}`);
  } else {
    const { generateSummary } = require('./summarizer');
    const resumo = generateSummary(chats);
    console.log('\n===== RESUMO GERADO =====\n');
    console.log(resumo);
  }
}

module.exports = {
  sendDailySummary,
  sendPendingSummary,
  sendSummaryForDate,
  loadChatsByDate
};
