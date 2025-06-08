module.exports = {
  apps : [{
    name   : "meu-bot-whatsapp",
    script : "./src/index.js", // Caminho para o seu arquivo principal
    instances: 1,
    exec_mode: "fork", // Ou "cluster" se sua app for stateless e puder ser escalada
    watch  : false, // Desabilitar watch em produção, a menos que você tenha um motivo específico
    max_memory_restart: '250M', // Exemplo: reiniciar se usar mais de 250MB de RAM
    env_production: { // Variáveis de ambiente para produção
       NODE_ENV: "production",
       // GOOGLE_APPLICATION_CREDENTIALS: "/path/to/your/service-account-file.json" // Se não estiver usando Workload Identity
       // Outras variáveis de ambiente necessárias para produção
    },
    // Configuração de logs do PM2 (opcional, pois o Cloud Logging captura stdout/stderr)
    // out_file: "/app/logs/out.log",
    // error_file: "/app/logs/error.log",
    // log_date_format: "YYYY-MM-DD HH:mm:ss Z"
  }]
}