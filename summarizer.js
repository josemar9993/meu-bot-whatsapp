// src/summarizer.js

// Importa a biblioteca de Sentiment para análise de sentimentos
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

/**
 * Gera um resumo das conversas.
 * 
 * @param {Object} chats - O objeto de chats carregado do arquivo JSON.
 * @returns {string} O resumo das conversas.
 */
function generateSummary(chats) {
  // Se for um array de mensagens simples, converte para formato agrupado por chatId
  let chatsArray;
  if (Array.isArray(chats) && chats.length > 0 && !chats[0].messages) {
    // Agrupa por chatId
    const grouped = {};
    chats.forEach(msg => {
      if (!grouped[msg.chatId]) grouped[msg.chatId] = [];
      grouped[msg.chatId].push(msg);
    });
    chatsArray = Object.values(grouped).map(messages => ({ chatId: messages[0].chatId, messages }));
  } else if (Array.isArray(chats)) {
    chatsArray = chats;
  } else {
    throw new Error('Formato de chats não suportado');
  }
  let totalMessages = 0;
  let totalSentimentScore = 0;
  let positiveMessages = 0;
  let negativeMessages = 0;
  let neutralMessages = 0;
  let pendencias = [];
  let resumoPorChat = [];
  let temposResposta = [];
  let engajamento = [];
  let temasPorChat = {};
  const temasChave = [
    {tema: 'Financeiro', palavras: ['preço','cobrança','valor','pagar','orçamento','boleto','pix']},
    {tema: 'Suporte', palavras: ['erro','problema','ajuda','suporte','bug','falha']},
    {tema: 'Agendamento', palavras: ['horário','marcar','agenda','amanhã','reunião','encontro']},
    {tema: 'Pessoal', palavras: ['família','amor','parabéns','saudade','abraço','feliz']},
    {tema: 'Mídia', palavras: ['foto','imagem','pdf','documento','áudio','vídeo']}
  ];
  chatsArray.forEach(chat => {
    totalMessages += chat.messages.length;
    let enviadas = 0;
    let recebidas = 0;
    let ultimaMsg = null;
    let ultimaMsgFromMe = null;
    let ultimaMsgFromContato = null;
    let tempos = [];
    let lastFromContato = null;
    let lastFromMe = null;
    let temasDetectados = new Set();
    chat.messages.forEach((messageObj, idx) => {
      const text = typeof messageObj === 'string' ? messageObj : messageObj.body;
      const fromMe = messageObj.fromMe;
      const sentimentResult = sentiment.analyze(text);
      totalSentimentScore += sentimentResult.score;
      if (sentimentResult.score > 0) positiveMessages++;
      else if (sentimentResult.score < 0) negativeMessages++;
      else neutralMessages++;
      if (fromMe) {
        enviadas++;
        ultimaMsgFromMe = messageObj;
        lastFromMe = messageObj;
        // Se a anterior era do contato, calcula tempo de resposta
        if (lastFromContato) {
          tempos.push(messageObj.timestamp - lastFromContato.timestamp);
        }
      } else {
        recebidas++;
        ultimaMsgFromContato = messageObj;
        lastFromContato = messageObj;
        // Se a anterior era sua, calcula tempo de resposta do contato
        if (lastFromMe) {
          tempos.push(messageObj.timestamp - lastFromMe.timestamp);
        }
      }
      ultimaMsg = messageObj;
      // Detecta temas
      for (const tema of temasChave) {
        for (const palavra of tema.palavras) {
          if (text && text.toLowerCase().includes(palavra)) temasDetectados.add(tema.tema);
        }
      }
    });
    // Detecta pendência: se a última mensagem do chat não foi enviada por você, está aguardando seu retorno
    if (ultimaMsg && !ultimaMsg.fromMe) {
      pendencias.push({
        chatId: chat.chatId || (chat.messages[0] && chat.messages[0].chatId) || 'desconhecido',
        contato: (ultimaMsg.senderName || chat.chatId || 'desconhecido'),
        mensagem: ultimaMsg.body,
        quando: ultimaMsg.isoTimestamp || '',
      });
    }
    // Engajamento: total de mensagens
    engajamento.push({
      chatId: chat.chatId || (chat.messages[0] && chat.messages[0].chatId) || 'desconhecido',
      contato: (ultimaMsg && ultimaMsg.senderName) || chat.chatId || 'desconhecido',
      total: chat.messages.length
    });
    // Temas
    temasPorChat[chat.chatId || (chat.messages[0] && chat.messages[0].chatId) || 'desconhecido'] = Array.from(temasDetectados);
    // Tempo médio de resposta (apenas respostas suas)
    const temposValidos = tempos.filter(t => t > 0 && t < 60*60*24*7); // ignora tempos absurdos
    const tempoMedio = temposValidos.length > 0 ? (temposValidos.reduce((a,b)=>a+b,0)/temposValidos.length) : null;
    temposResposta.push({
      chatId: chat.chatId || (chat.messages[0] && chat.messages[0].chatId) || 'desconhecido',
      tempoMedio
    });
    resumoPorChat.push(`Chat: ${(chat.chatId || (chat.messages[0] && chat.messages[0].chatId) || 'desconhecido')}\n  Enviadas por você: ${enviadas}\n  Recebidas: ${recebidas}\n  Última mensagem: ${(ultimaMsg && ultimaMsg.body) || ''}\n  Temas: ${Array.from(temasDetectados).join(', ') || 'Nenhum'}`);
  });
  const averageSentiment = totalMessages > 0 ? totalSentimentScore / totalMessages : 0;
  // Top 3 engajamento
  const topEngajamento = engajamento.sort((a,b)=>b.total-a.total).slice(0,3);
  // Top 3 chats com maior tempo médio de resposta seu
  const topTempos = temposResposta.filter(t=>t.tempoMedio).sort((a,b)=>b.tempoMedio-a.tempoMedio).slice(0,3);
  // Adiciona estatísticas extras
  // 1. Tempo médio geral de resposta seu
  const temposValidosGlobais = temposResposta.map(t=>t.tempoMedio).filter(t=>t);
  const tempoMedioGeral = temposValidosGlobais.length > 0 ? (temposValidosGlobais.reduce((a,b)=>a+b,0)/temposValidosGlobais.length) : null;
  // 2. Contato com mais pendências
  let pendenciasPorContato = {};
  pendencias.forEach(p => {
    pendenciasPorContato[p.contato] = (pendenciasPorContato[p.contato] || 0) + 1;
  });
  const topPendencias = Object.entries(pendenciasPorContato).sort((a,b)=>b[1]-a[1]).slice(0,3);
  // 3. Estatísticas de temas
  let temasCount = {};
  Object.values(temasPorChat).flat().forEach(t => { temasCount[t] = (temasCount[t]||0)+1; });
  const topTemas = Object.entries(temasCount).sort((a,b)=>b[1]-a[1]).slice(0,3);
  // 4. Mensagem mais longa recebida e enviada
  let msgMaisLongaRecebida = null, msgMaisLongaEnviada = null;
  chatsArray.forEach(chat => {
    chat.messages.forEach(m => {
      if (!m.fromMe && (!msgMaisLongaRecebida || (m.body && m.body.length > msgMaisLongaRecebida.body.length))) msgMaisLongaRecebida = m;
      if (m.fromMe && (!msgMaisLongaEnviada || (m.body && m.body.length > msgMaisLongaEnviada.body.length))) msgMaisLongaEnviada = m;
    });
  });
  let summary = `Resumo das Conversas:\n`;
  summary += `Total de Mensagens: ${totalMessages}\n`;
  summary += `Mensagens Positivas: ${positiveMessages}\n`;
  summary += `Mensagens Negativas: ${negativeMessages}\n`;
  summary += `Mensagens Neutras: ${neutralMessages}\n`;
  summary += `Sentimento Médio: ${averageSentiment.toFixed(2)}\n`;
  summary += `\nResumo por chat:\n` + resumoPorChat.join('\n') + '\n';
  summary += `\nTop 3 contatos mais engajados:\n`;
  topEngajamento.forEach(e => summary += `- ${e.contato} (${e.chatId}): ${e.total} mensagens\n`);
  summary += `\nTop 3 maiores tempos médios de resposta (em segundos):\n`;
  topTempos.forEach(t => summary += `- ${t.chatId}: ${Math.round(t.tempoMedio)}s\n`);
  summary += `\nTempo médio geral de resposta seu: ${tempoMedioGeral ? Math.round(tempoMedioGeral)+'s' : 'N/A'}\n`;
  summary += `\nTop 3 contatos com mais pendências:\n`;
  topPendencias.forEach(([contato, qtd]) => summary += `- ${contato}: ${qtd} pendências\n`);
  summary += `\nTop 3 temas mais frequentes:\n`;
  topTemas.forEach(([tema, qtd]) => summary += `- ${tema}: ${qtd} chats\n`);
  summary += `\nMensagem mais longa recebida: ${(msgMaisLongaRecebida && msgMaisLongaRecebida.body) ? msgMaisLongaRecebida.body.slice(0,100) : 'N/A'}\n`;
  summary += `Mensagem mais longa enviada: ${(msgMaisLongaEnviada && msgMaisLongaEnviada.body) ? msgMaisLongaEnviada.body.slice(0,100) : 'N/A'}\n`;
  if (pendencias.length > 0) {
    summary += `\nConversas aguardando seu retorno:\n`;
    pendencias.forEach(p => {
      summary += `- ${p.contato} (${p.chatId}) em ${p.quando}: "${p.mensagem}"\n`;
    });
  } else {
    summary += '\nNenhuma conversa pendente de resposta.\n';
  }
  return summary;
}

// Exporta a função de geração de resumo
module.exports = {
  generateSummary
};