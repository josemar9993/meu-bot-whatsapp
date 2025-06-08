// src/test-summary.js

// Caminho corrigido para o módulo emailer
const emailer = require('./emailer');
const logger = require('./logger'); // Usar o logger para consistência

// Função assíncrona para executar o teste de envio de e-mail
async function testSendDailyEmail() {
  logger.info('[TestEmail] Iniciando teste de envio de e-mail diário...');

  // Dados de chat fictícios para o teste
  // Em um cenário real, estes viriam de utils.getStoredChats()
  const mockChats = {
    'chat1@c.us': [
      { chatId: 'chat1@c.us', id: 'msg1', timestamp: Math.floor(Date.now() / 1000) - 3600, isoTimestamp: new Date().toISOString(), senderName: 'Alice', type: 'chat', body: 'Olá Bob, tudo bem?', fromMe: false },
      { chatId: 'chat1@c.us', id: 'msg2', timestamp: Math.floor(Date.now() / 1000) - 1800, isoTimestamp: new Date().toISOString(), senderName: 'Bob', type: 'chat', body: 'Tudo ótimo, Alice! E com você?', fromMe: false },
      { chatId: 'chat1@c.us', id: 'msg3', timestamp: Math.floor(Date.now() / 1000), isoTimestamp: new Date().toISOString(), senderName: 'Alice', type: 'chat', body: 'Também estou bem. Precisamos discutir o projeto X.', fromMe: false },
    ],
    'chat2@c.us': [
      { chatId: 'chat2@c.us', id: 'msg4', timestamp: Math.floor(Date.now() / 1000) - 7200, isoTimestamp: new Date().toISOString(), senderName: 'Charlie', type: 'chat', body: 'Reunião amanhã às 10h?', fromMe: false },
    ]
  };

  try {
    logger.info('[TestEmail] Chamando emailer.sendDailySummary...');
    // Nota: sendDailySummary internamente chama generateSummary, que agora gera um resumo local.
    // A configuração da OPENAI_API_KEY não é mais necessária para esta funcionalidade.
    await emailer.sendDailySummary(mockChats);
    logger.info('[TestEmail] Função sendDailySummary executada. Verifique a caixa de entrada de: ' + process.env.EMAIL_TO);
  } catch (error) {
    logger.error('[TestEmail] Erro ao tentar enviar o e-mail de resumo diário:', { message: error.message, stack: error.stack });
  }
}

// Executar o teste
testSendDailyEmail();

// ...restante do código do arquivo test-summary.js...