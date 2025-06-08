const fs = require('fs');
const path = require('path');

function isValidMessage(msg) {
  return msg && msg.body && msg.body.trim();
}

function rotateFileIfNeeded(filePath, maxSizeMB = 5) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > maxSizeMB * 1024 * 1024) {
    let i = 1;
    let newFilePath;
    const base = filePath.replace(/\.json$/, '');
    do {
      newFilePath = `${base}-${i}.json`;
      i++;
    } while (fs.existsSync(newFilePath) && fs.statSync(newFilePath).size > maxSizeMB * 1024 * 1024);
    return newFilePath;
  }
  return filePath;
}

function saveMessageWithName(msg, senderName, chatsDir, logger) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let filePath = path.join(chatsDir, `chats-${today}.json`);
  let messages = [];
  try {
    fs.mkdirSync(chatsDir, { recursive: true });
    filePath = rotateFileIfNeeded(filePath);
    if (fs.existsSync(filePath)) {
      try {
        messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!Array.isArray(messages)) messages = [];
      } catch (e) {
        logger.error(`Erro ao ler arquivo existente: ${e}`);
        messages = [];
      }
    }
  } catch (err) {
    logger.error(`Erro ao criar diretório: ${err}`);
    return;
  }

  messages.push({
    chatId: msg.from,
    id: msg.id?._serialized || msg.id || '',
    timestamp: msg.timestamp || Math.floor(Date.now()/1000),
    isoTimestamp: new Date().toISOString(),
    senderName,
    type: msg.type || 'chat',
    body: msg.body || '',
    fromMe: msg.fromMe
  });

  try {
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf8');
    logger.info(`Mensagem salva em ${filePath} (${messages.length} mensagens no total)`);
  } catch (err) {
    logger.error(`Erro ao salvar mensagem: ${err}`);
  }
}

module.exports = {
  isValidMessage,
  saveMessageWithName
};
