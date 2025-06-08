module.exports = {
  apps : [{
    name   : "meu-bot-whatsapp", // Nome do processo no PM2
    script : "./src/index.js",   // Caminho para o script principal. Certifique-se de que é 'index.js' e não 'index.js.'
    watch  : false,              // 'false' é geralmente recomendado para produção
    max_memory_restart : "500M", // Descomentado e definido para 500MB. Ajuste conforme necessário.
    // env_production: {
    //   NODE_ENV: "production",
    // },
    // env_development: {
    //   NODE_ENV: "development"
    // }
  }]
}
