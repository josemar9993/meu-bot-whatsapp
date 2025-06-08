const removeAccents = require('remove-accents');
const STOPWORDS = [
  "a","o","as","os","de","do","da","dos","das","que","e","é","em","um","uma","para","por","com","se","no","na","nos","nas"
];

function preprocessText(text) {
  text = text.toLowerCase();
  text = removeAccents(text);
  text = text.replace(/[.,!?;:()\[\]{}"'-]/g, '');
  let tokens = text.split(/\s+/).filter(t => t && !STOPWORDS.includes(t));
  return tokens;
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

function countBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

function topWords(tokens, n = 10) {
  const freq = {};
  tokens.forEach(t => freq[t] = (freq[t] || 0) + 1);
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w, c]) => `${w} (${c})`);
}

function detectThemes(tokens) {
  const joined = tokens.join(' ');
  const themes = [];
  if (/(amor|amo|bom dia|❤️|😃)/.test(joined)) themes.push("Relacionamento/Pessoal");
  if (/(agenda|visita|horário|marcar|amanhã|terça|quinta)/.test(joined)) themes.push("Agendamentos/Compromissos");
  if (/(link|https:\/\/|noticia|newsletter|ciencia)/.test(joined)) themes.push("Informações/Notícias");
  if (/(preço|custo|valor|pagar|trabalho|alunos|cobrança|video|orçamento)/.test(joined)) themes.push("Comercial/Financeiro");
  if (/(quando finalizar|avisa|pendente|preciso|tem)/.test(joined)) themes.push("Solicitações/Pendências");
  if (/(pptx|xlsx|pdf|\[image\]|\[ptt\])/.test(joined)) themes.push("Mídia/Documentos Compartilhados");
  if (/(problema|ajuda|não funciona|suporte|erro)/.test(joined)) themes.push("Suporte/Problemas");
  return themes.slice(0, 3);
}

function getContactName(msgs) {
  const firstReceived = msgs.find(m => m.fromMe === false);
  if (firstReceived) return `${firstReceived.senderName} (${firstReceived.chatId})`;
  return `BOT (${msgs[0].chatId})`;
}

function getContactNameShort(msgs) {
  const firstReceived = msgs.find(m => m.fromMe === false);
  const chatId = msgs[0].chatId;
  const shortId = chatId.length > 12 ? chatId.slice(0, 8) + "..." + chatId.slice(-8) : chatId;
  if (firstReceived) return `${firstReceived.senderName} (${shortId})`;
  return `BOT (${shortId})`;
}

function formatDate(iso) {
  return iso ? iso : '';
}

async function generateSummary(messages) {
  // Seção 2.1
  const totalMsgs = messages.length;
  const sentByBot = messages.filter(m => m.fromMe).length;
  const received = messages.filter(m => !m.fromMe).length;

  // Seção 2.2
  const chatsById = groupBy(messages, 'chatId');
  const uniqueChats = Object.keys(chatsById).length;
  const contactNames = Object.values(chatsById).map(getContactNameShort).sort();

  // Seção 3
  let table3 = `| Contato | Enviadas pelo BOT | Recebidas do Contato | % Interação BOT | Início da Conversa | Fim da Conversa | Tipos Enviados (BOT) | Tipos Recebidos (Contato) |\n|---|---|---|---|---|---|---|---|\n`;
  for (const [chatId, msgs] of Object.entries(chatsById)) {
    const sent = msgs.filter(m => m.fromMe).length;
    const recv = msgs.filter(m => !m.fromMe).length;
    const pctBot = Math.round((sent / msgs.length) * 100);
    const sorted = msgs.slice().sort((a, b) => a.timestamp - b.timestamp);
    const ini = formatDate(sorted[0]?.isoTimestamp);
    const fim = formatDate(sorted[sorted.length - 1]?.isoTimestamp);

    const tiposEnviados = countBy(msgs.filter(m => m.fromMe), 'type');
    const tiposRecebidos = countBy(msgs.filter(m => !m.fromMe), 'type');
    const tipos = ['chat', 'ptt', 'image', 'document'];
    const tiposEnviadosStr = tipos.map(t => `${t}: ${tiposEnviados[t] || 0}`).join(', ');
    const tiposRecebidosStr = tipos.map(t => `${t}: ${tiposRecebidos[t] || 0}`).join(', ');

    table3 += `| ${getContactNameShort(msgs)} | ${sent} | ${recv} | ${pctBot} % | ${ini} | ${fim} | ${tiposEnviadosStr} | ${tiposRecebidosStr} |\n`;
  }

  // Seção 4
  let pendentes = [];
  for (const [chatId, msgs] of Object.entries(chatsById)) {
    const last = msgs[msgs.length - 1];
    if (last && last.fromMe === false) {
      pendentes.push({
        contato: getContactNameShort(msgs),
        isoTimestamp: last.isoTimestamp,
        total: msgs.length
      });
    }
  }
  let pendentesStr = pendentes.length
    ? pendentes.map(p => `- ${p.contato} | Última mensagem: ${p.isoTimestamp} | Total: ${p.total}`).join('\n')
    : "Nenhuma conversa pendente identificada hoje.";

  // Seção 5
  let analiseConteudo = '';
  for (const [chatId, msgs] of Object.entries(chatsById)) {
    const nome = getContactNameShort(msgs);
    const chatTexts = msgs.filter(m => m.type === 'chat').map(m => m.body).join(' ');
    const tokens = preprocessText(chatTexts);
    const palavras = topWords(tokens, 10);
    const temas = detectThemes(tokens);
    analiseConteudo += `Conversa com ${nome}: Assuntos principais ➔ [${temas.join(', ') || 'Nenhum'}]; Palavras-chave destacadas ➔ [${palavras.join(', ')}].\n`;
  }

  // Seção 6
  const timeline = messages.slice().sort((a, b) => a.timestamp - b.timestamp).map(m => {
    const remetente = m.fromMe ? 'BOT' : m.senderName;
    const destinatario = m.fromMe ? getContactNameShort(chatsById[m.chatId]) : 'BOT';
    let tipo = m.type !== 'chat' ? ` [${m.type}]` : '';
    return `${m.isoTimestamp} | ${remetente}${tipo} → ${destinatario}: "${m.body}"`;
  }).join('\n');

  // Monta o relatório parcial (2 a 6)
  return `
## 2.1. Total de Mensagens (Dia)
- Total de mensagens: ${totalMsgs}
- Enviadas pelo BOT: ${sentByBot}
- Recebidas de contatos: ${received}

## 2.2. Total de Conversas Distintas com Contatos
- Total de ${uniqueChats} conversas distintas com: ${contactNames.join(', ')}

## 3. DETALHAMENTO DAS CONVERSAS
${table3}

## 4. ATENÇÃO NECESSÁRIA: CONVERSAS AGUARDANDO RESPOSTA
${pendentesStr}

## 5. ANÁLISE DE CONTEÚDO POR CONVERSA
${analiseConteudo}

## 6. LINHA DO TEMPO CONSOLIDADA
${timeline}
`;
}

module.exports = { generateSummary };
