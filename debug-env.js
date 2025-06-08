const path = require('path');
const fs = require('fs');

// Caminho absoluto para o arquivo .env na pasta Documents
const envPath = 'C:\\Users\\supor\\Documents\\meu-bot-whatsapp\\.env';

console.log(`Tentando carregar .env de: ${envPath}`);

if (fs.existsSync(envPath)) {
  console.log(`Arquivo .env encontrado em: ${envPath}`);
} else {
  console.error(`ERRO: Arquivo .env NÃO encontrado em: ${envPath}`);
  console.log('Por favor, verifique se o arquivo .env existe no caminho especificado e se o caminho está correto.');
  process.exit(1); // Sair se o arquivo .env não for encontrado
}

const dotenvResult = require('dotenv').config({ path: envPath });

if (dotenvResult.error) {
  console.error('ERRO ao carregar .env:', dotenvResult.error);
} else if (Object.keys(dotenvResult.parsed || {}).length > 0) {
  console.log('Variáveis carregadas com sucesso pelo dotenv:', Object.keys(dotenvResult.parsed));
} else {
  console.warn('dotenv.config() não retornou erro, mas NENHUMA variável foi parseada. Verifique o conteúdo e formato do arquivo .env.');
  console.log('Conteúdo parseado (se houver):', dotenvResult.parsed);
}

console.log('--- Variáveis de Ambiente em process.env ---');
console.log('OPENAI_API_KEY (início) =', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 15)}... (Não mais utilizado ativamente)` : 'Não definido (Não mais utilizado ativamente)');
console.log('EMAIL_USER =', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD está definida?', !!process.env.EMAIL_PASSWORD);
console.log('EMAIL_TO =', process.env.EMAIL_TO);
console.log('WHATSAPP_ADMIN_NUMBER =', process.env.WHATSAPP_ADMIN_NUMBER);
console.log('DEFAULT_SUMMARY_DAYS =', process.env.DEFAULT_SUMMARY_DAYS);
console.log('OPENAI_MODEL =', process.env.OPENAI_MODEL ? `${process.env.OPENAI_MODEL} (Não mais utilizado ativamente)` : 'Não definido (Não mais utilizado ativamente)');
console.log('----------------------------------------');

// Verifica se as variáveis essenciais foram carregadas
const essentialVars = ['EMAIL_USER', 'EMAIL_PASSWORD', 'WHATSAPP_ADMIN_NUMBER']; // Removido OPENAI_API_KEY
let allEssentialLoaded = true;
essentialVars.forEach(v => {
    if (!process.env[v]) {
        console.warn(`AVISO: Variável essencial ${v} não está definida em process.env!`);
        allEssentialLoaded = false;
    }
});

if (allEssentialLoaded && Object.keys(dotenvResult.parsed || {}).length > 0) {
    console.log("\nTeste de carregamento de variáveis de ambiente parece OK.");
} else {
    console.error("\nERRO: Teste de carregamento de variáveis de ambiente FALHOU. Verifique os logs acima.");
}
