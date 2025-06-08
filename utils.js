// src/utils.js

const fs = require('fs');
const path = require('path');
const logger = require('./logger'); 

// O diretório onde os arquivos JSON de chats diários serão salvos
const CHATS_SALVOS_DIR = path.resolve(__dirname, 'chats_salvos');

/**
 * Garante que o diretório de chats salvos exista.
 */
async function ensureChatsSalvosDirExists() {
  // Log para confirmar que esta função e, portanto, o diretório correto está sendo considerado.
  logger.info(`[utils.js] Função ensureChatsSalvosDirExists chamada. Verificando/criando diretório: ${CHATS_SALVOS_DIR}`);
  try {
    if (!fs.existsSync(CHATS_SALVOS_DIR)) {
      await fs.promises.mkdir(CHATS_SALVOS_DIR, { recursive: true });
      logger.info(`Diretório de chats salvos criado em: ${CHATS_SALVOS_DIR}`);
    }
  } catch (error) {
    logger.error(`Erro ao criar o diretório de chats salvos ${CHATS_SALVOS_DIR}:`, { error: error.message, stack: error.stack });
    // throw error; 
  }
}

/**
 * Lê todos os arquivos JSON de chats da pasta src/chats_salvos, agrupa as mensagens por chatId.
 * Cada arquivo diário é esperado ser um array JSON de mensagens.
 * @param {number} [daysToLoad=7] Número de dias anteriores para carregar os arquivos. Padrão 7 dias.
 * @returns {Promise<Object>} Um objeto onde as chaves são chatIds e os valores são arrays de mensagens.
 */
async function getStoredChats(daysToLoad = 7) {
  logger.info(`[utils.js] Iniciando getStoredChats para os últimos ${daysToLoad} dias de '${CHATS_SALVOS_DIR}'.`);
  const allChats = {};
  await ensureChatsSalvosDirExists();

  try {
    const files = await fs.promises.readdir(CHATS_SALVOS_DIR);
    const today = new Date();
    const targetFiles = [];

    for (let i = 0; i < daysToLoad; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const chatFileName = `chats-${year}-${month}-${day}.json`; 
      if (files.includes(chatFileName)) {
        targetFiles.push(chatFileName);
      }
    }
    
    logger.info(`[utils.js] Arquivos de chat encontrados para carregar: ${targetFiles.join(', ')}`);

    for (const file of targetFiles) {
      const filePath = path.join(CHATS_SALVOS_DIR, file);
      try {
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        if (fileContent.trim() === '') {
          logger.warn(`[utils.js] Arquivo de chat ${file} está vazio.`);
          continue;
        }
        const messagesInFile = JSON.parse(fileContent); // Parseia o arquivo como um array JSON
        
        if (Array.isArray(messagesInFile)) {
          for (const messageData of messagesInFile) {
            if (messageData.chatId) {
              if (!allChats[messageData.chatId]) {
                allChats[messageData.chatId] = [];
              }
              allChats[messageData.chatId].push(messageData);
            } else {
              // Adicionado log para mensagens sem chatId
              logger.warn(`[utils.js] Mensagem encontrada sem chatId no arquivo ${file}. Dados da mensagem: ${JSON.stringify(messageData)}`);
            }
          }
        } else {
          logger.warn(`[utils.js] Conteúdo do arquivo ${file} não é um array JSON.`);
        }
      } catch (parseOrReadError) {
        logger.error(`[utils.js] Erro ao ler ou parsear o arquivo de chat ${filePath}:`, { error: parseOrReadError.message, stack: parseOrReadError.stack });
      }
    }

    // Ordenar mensagens por timestamp para cada chat
    for (const chatId in allChats) {
      allChats[chatId].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }

    logger.info(`[utils.js] Total de ${Object.keys(allChats).length} chats carregados de arquivos JSON diários.`);
  } catch (err) {
    logger.error('[utils.js] Erro ao listar arquivos no diretório de chats salvos:', { error: err.message, stack: err.stack });
  }
  return allChats;
}

/**
 * Adiciona uma nova mensagem a um arquivo JSON diário na pasta src/chats_salvos/.
 * O arquivo é lido, a nova mensagem é adicionada a um array, e o arquivo é reescrito.
 * @param {string} chatId    O ID do chat.
 * @param {string} msgBody   O conteúdo/texto da mensagem.
 * @param {boolean} fromMe   Indica a direção da mensagem.
 * @param {number} timestamp O timestamp Unix da mensagem.
 * @param {string} senderName O nome do remetente da mensagem.
 * @param {string} messageId O ID único da mensagem.
 * @param {string} messageType O tipo da mensagem (chat, image, etc.).
 */
async function storeMessage(chatId, msgBody, fromMe, timestamp, senderName, messageId, messageType) {
  await ensureChatsSalvosDirExists(); 

  let chatFilePath = ''; 
  try {
    const date = new Date(timestamp * 1000); 
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
    const day = date.getDate().toString().padStart(2, '0');

    const chatFileName = `chats-${year}-${month}-${day}.json`; 
    chatFilePath = path.join(CHATS_SALVOS_DIR, chatFileName); 

    logger.info(`[utils.js - storeMessage] Preparando para armazenar mensagem no arquivo: ${chatFilePath}`);

    const messageData = {
      chatId: chatId,
      id: messageId,
      timestamp: timestamp,
      isoTimestamp: date.toISOString(),
      senderName: senderName, // Nome do contato
      type: messageType,
      body: msgBody,          // Mensagem
      fromMe: fromMe
    };

    let messagesArray = [];
    try {
      // Tenta ler o arquivo existente
      if (fs.existsSync(chatFilePath)) {
        const fileContent = await fs.promises.readFile(chatFilePath, 'utf8');
        if (fileContent.trim() !== '') {
          messagesArray = JSON.parse(fileContent);
          if (!Array.isArray(messagesArray)) {
            logger.warn(`[utils.js - storeMessage] Conteúdo existente em ${chatFilePath} não era um array. Será sobrescrito com um novo array.`);
            messagesArray = [];
          }
        }
      }
    } catch (readParseError) {
      logger.error(`[utils.js - storeMessage] Erro ao ler ou parsear ${chatFilePath}. Iniciando com array vazio.`, { error: readParseError.message });
      messagesArray = []; // Se houver erro (ex: JSON inválido), começa com um array novo para evitar corrupção total
    }

    messagesArray.push(messageData);

    // Escreve o array inteiro de volta no arquivo, com indentação para legibilidade
    await fs.promises.writeFile(chatFilePath, JSON.stringify(messagesArray, null, 2), 'utf8');
    logger.info(`[utils.js - storeMessage] Mensagem ID ${messageId} armazenada com sucesso em ${chatFilePath}. Total de ${messagesArray.length} mensagens no arquivo.`);

  } catch (err) {
    logger.error(`[utils.js - storeMessage] Falha crítica ao armazenar mensagem no arquivo de chat JSON. ARQUIVO ALVO: ${chatFilePath}. ChatID: ${chatId}.`, { 
      messageId, 
      error: err.message, 
      stack: err.stack 
    });
  }
}

module.exports = {
  getStoredChats,
  storeMessage
};