// Um logger simples para fins de exemplo e teste.
// Adapte conforme o seu sistema de logging real.
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

module.exports = logger;
