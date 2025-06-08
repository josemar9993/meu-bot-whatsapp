const fs = require('fs').promises;
const path = require('path');
const assert = require('assert');

// Mock do logger antes de carregar utils
let loggedMessages = [];
const mockLogger = {
  info: (message, ...args) => loggedMessages.push({ level: 'info', message, args }),
  warn: (message, ...args) => loggedMessages.push({ level: 'warn', message, args }),
  error: (message, ...args) => loggedMessages.push({ level: 'error', message, args }),
};

const originalLoggerPath = require.resolve('./logger');
const originalLogger = require(originalLoggerPath); // Guardar o logger original
require.cache[originalLoggerPath] = { exports: mockLogger };

const utils = require('./utils'); // Agora utils.js usará o mockLogger

// O diretório real de chats_salvos será usado para testes, com limpeza antes e depois.
const ACTUAL_CHATS_DIR_FOR_TESTING = path.resolve(__dirname, 'chats_salvos');

async function setupActualDirForTest() {
  try {
    // Garante que o diretório exista, pois utils.ensureChatsSalvosDirExists() será chamado pelas funções testadas
    await fs.mkdir(ACTUAL_CHATS_DIR_FOR_TESTING, { recursive: true });
    const items = await fs.readdir(ACTUAL_CHATS_DIR_FOR_TESTING);
    for (const item of items) {
      if (item.endsWith('.json') && item.startsWith('chats-')) { // Apaga apenas arquivos json de chat relevantes
        await fs.unlink(path.join(ACTUAL_CHATS_DIR_FOR_TESTING, item));
      }
    }
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn("Aviso ao limpar diretório de chats:", e.message);
    // Se o diretório não existe, utils.ensureChatsSalvosDirExists o criará.
  }
  loggedMessages = []; // Limpa logs de setups anteriores
}

async function cleanupActualDirForTest() {
  try {
    const items = await fs.readdir(ACTUAL_CHATS_DIR_FOR_TESTING);
    for (const item of items) {
      if (item.endsWith('.json') && item.startsWith('chats-')) { // Seja específico na limpeza
        await fs.unlink(path.join(ACTUAL_CHATS_DIR_FOR_TESTING, item));
      }
    }
  } catch (e) { /* ignora erros na limpeza, ex: diretório já removido ou vazio */ }
  // Restaura o logger original no cache do require
  require.cache[originalLoggerPath] = { exports: originalLogger };
}

function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function runTests() {
  try {
    console.log('Iniciando testes para utils.js (operando no diretório real de chats_salvos)...');

    // Teste 1: storeMessage - Armazenar uma única mensagem
    await setupActualDirForTest();
    console.log('Teste 1: storeMessage - Armazenar uma única mensagem');
    const ts1 = Math.floor(Date.now() / 1000);
    const date1 = new Date(ts1 * 1000);
    await utils.storeMessage('chat1@c.us', 'Olá mundo', false, ts1, 'Sender1', 'msg1', 'chat');
    const todayFile1 = `chats-${getTodayDateString(date1)}.json`;
    const filePath1 = path.join(ACTUAL_CHATS_DIR_FOR_TESTING, todayFile1);
    const content1 = JSON.parse(await fs.readFile(filePath1, 'utf8'));
    assert.strictEqual(content1.length, 1, 'Deveria haver 1 mensagem no arquivo');
    assert.strictEqual(content1[0].id, 'msg1', 'ID da mensagem incorreto');
    console.log('Teste 1 passou.');
    await cleanupActualDirForTest(); // Limpa após cada teste principal para isolamento

    // Teste 2: storeMessage - Armazenar múltiplas mensagens no mesmo dia
    await setupActualDirForTest();
    console.log('Teste 2: storeMessage - Armazenar múltiplas mensagens no mesmo dia');
    const ts2_1 = Math.floor(Date.now() / 1000);
    const date2 = new Date(ts2_1 * 1000);
    const ts2_2 = ts2_1 + 1;
    await utils.storeMessage('chat1@c.us', 'Msg 1', true, ts2_1, 'Me', 'msg2_1', 'chat');
    await utils.storeMessage('chat1@c.us', 'Msg 2', false, ts2_2, 'Sender2', 'msg2_2', 'chat'); // Mesmo dia
    const filePath2 = path.join(ACTUAL_CHATS_DIR_FOR_TESTING, `chats-${getTodayDateString(date2)}.json`);
    const content2 = JSON.parse(await fs.readFile(filePath2, 'utf8'));
    assert.strictEqual(content2.length, 2, 'Deveria haver 2 mensagens no arquivo');
    console.log('Teste 2 passou.');
    await cleanupActualDirForTest();

    // Teste 3: getStoredChats - Ler mensagens armazenadas
    await setupActualDirForTest();
    console.log('Teste 3: getStoredChats - Ler mensagens armazenadas');
    const dateYesterday = new Date();
    dateYesterday.setDate(dateYesterday.getDate() - 1);
    const ts3_1 = Math.floor(dateYesterday.getTime() / 1000); // Ontem
    const ts3_2 = Math.floor(Date.now() / 1000); // Hoje

    await utils.storeMessage('chat2@c.us', 'Mensagem de ontem', false, ts3_1, 'Sender3', 'msg3_1', 'chat');
    await utils.storeMessage('chat2@c.us', 'Mensagem de hoje', true, ts3_2, 'Me', 'msg3_2', 'chat');
    await utils.storeMessage('chat3@c.us', 'Outro chat', false, ts3_2, 'Sender4', 'msg3_3', 'chat');

    const chats = await utils.getStoredChats(2); // Carregar últimos 2 dias
    assert.ok(chats['chat2@c.us'], 'Chat2 deveria existir');
    assert.strictEqual(chats['chat2@c.us'].length, 2, 'Chat2 deveria ter 2 mensagens');
    assert.strictEqual(chats['chat2@c.us'][0].id, 'msg3_1', 'Primeira mensagem do Chat2 incorreta (ordenada por timestamp)');
    
    assert.ok(chats['chat3@c.us'], 'Chat3 deveria existir');
    assert.strictEqual(chats['chat3@c.us'].length, 1, 'Chat3 deveria ter 1 mensagem');
    console.log('Teste 3 passou.');
    await cleanupActualDirForTest();

    // Teste 4: getStoredChats - Mensagem sem chatId (para verificar o log)
    await setupActualDirForTest();
    console.log('Teste 4: getStoredChats - Mensagem sem chatId');
    const dateStr4 = getTodayDateString(new Date());
    const badMessageFilePath = path.join(ACTUAL_CHATS_DIR_FOR_TESTING, `chats-${dateStr4}.json`);
    const badMessageContent = [
      { chatId: 'chat4@c.us', id: 'goodMsg', body: 'Boa', timestamp: Math.floor(Date.now() / 1000) },
      { id: 'badMsg', body: 'Sem chatId', timestamp: Math.floor(Date.now() / 1000) + 1 }
    ];
    await fs.writeFile(badMessageFilePath, JSON.stringify(badMessageContent, null, 2));
    
    loggedMessages = []; // Limpa logs especificamente para esta chamada
    const chats4 = await utils.getStoredChats(1);
    assert.ok(chats4['chat4@c.us'], 'Chat4 deveria existir');
    assert.strictEqual(chats4['chat4@c.us'].length, 1, 'Chat4 deveria ter 1 mensagem (a boa)');
    
    const warnLog = loggedMessages.find(log => log.level === 'warn' && log.message.includes('Mensagem encontrada sem chatId'));
    assert.ok(warnLog, 'Deveria ter logado um aviso para mensagem sem chatId');
    console.log('Teste 4 passou.');
    await cleanupActualDirForTest(); // Corrigido de cleanupActualDirFor_test

    // Adicionar mais testes conforme necessário, por exemplo, para arquivos vazios ou JSON inválido.

    // Teste 5: getStoredChats - Arquivo de chat vazio
    await setupActualDirForTest();
    console.log('Teste 5: getStoredChats - Arquivo de chat vazio');
    const emptyFilePath = path.join(ACTUAL_CHATS_DIR_FOR_TESTING, `chats-${getTodayDateString(new Date())}.json`);
    await fs.writeFile(emptyFilePath, ''); // Arquivo vazio
    
    loggedMessages = [];
    const chats5 = await utils.getStoredChats(1);
    assert.strictEqual(Object.keys(chats5).length, 0, 'Nenhum chat deveria ser carregado de um arquivo vazio');
    const emptyFileLog = loggedMessages.find(log => 
      log.level === 'warn' && log.message.includes('Arquivo de chat') && log.message.includes('está vazio')
    );
    assert.ok(emptyFileLog, 'Deveria ter logado um aviso para arquivo vazio');
    console.log('Teste 5 passou.');
    await cleanupActualDirForTest();

    // Teste 6: getStoredChats - Arquivo de chat com JSON inválido
    await setupActualDirForTest();
    console.log('Teste 6: getStoredChats - Arquivo de chat com JSON inválido');
    const invalidJsonFilePath = path.join(ACTUAL_CHATS_DIR_FOR_TESTING, `chats-${getTodayDateString(new Date())}.json`);
    await fs.writeFile(invalidJsonFilePath, '[{"id": "msg1", "chatId": "c1"}, // JSON inválido'); 
    
    loggedMessages = [];
    const chats6 = await utils.getStoredChats(1);
    assert.strictEqual(Object.keys(chats6).length, 0, 'Nenhum chat deveria ser carregado de um arquivo JSON inválido');
    const errorLog = loggedMessages.find(log => 
      log.level === 'error' && log.message.includes('Erro ao ler ou parsear o arquivo de chat')
    );
    assert.ok(errorLog, 'Deveria ter logado um erro para JSON inválido');
    console.log('Teste 6 passou.');
    await cleanupActualDirForTest();

    console.log('Todos os testes de utils.js passaram com sucesso!');

  } catch (error) {
    console.error('Um teste falhou:', error);
    // Garante a limpeza mesmo em caso de falha em um teste
    await cleanupActualDirForTest(); 
  } finally {
    // A limpeza final é feita dentro do try/catch após cada teste ou no bloco catch.
    // Se um erro ocorrer antes do primeiro cleanup, este finally pode ser redundante
    // mas não prejudicial.
    // await cleanupActualDirForTest(); // Removido pois a limpeza é feita após cada teste ou no catch.
  }
}

runTests();
