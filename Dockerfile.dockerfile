FROM node:18.20.3-bookworm-slim

# Set Environment Variables
ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    # Define o diretório de cache do Puppeteer dentro do /app para que seja propriedade do usuário node após o chown
    # Puppeteer irá baixar seu próprio Chromium aqui
    PUPPETEER_CACHE_DIR=/app/node_modules/.cache/puppeteer

# Create app directory and set as working directory
WORKDIR /app

# Install system dependencies for Puppeteer's bundled Chromium, and upgrade packages
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    # Dependências para Puppeteer/Chromium (sem instalar google-chrome-stable separadamente)
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    # gnupg não é mais estritamente necessário se não estamos adicionando o repo do Google Chrome
    # mas pode ser útil para outras operações wget/apt-key se necessário no futuro.
    gnupg && \
    # Limpar cache do apt
    rm -rf /var/lib/apt/lists/*

# Copiar arquivos de definição de pacotes
# Copie package.json e package-lock.json (ou yarn.lock, pnpm-lock.yaml)
COPY package.json package-lock.json* ./
# COPY yarn.lock ./
# COPY pnpm-lock.yaml ./

# Instalar dependências do projeto Node.js
# Usar --production para pular devDependencies.
# npm install irá agora baixar o Chromium via Puppeteer devido à ausência de PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install --production --no-cache

# Instalar pm2-runtime globalmente para garantir que o comando esteja disponível
RUN npm install -g pm2-runtime && npm cache clean --force

# Copiar o restante do código da aplicação
# Certifique-se de ter um .dockerignore para evitar copiar node_modules, .git, etc.
COPY . .

# Mudar propriedade de todos os arquivos da aplicação para o usuário 'node'
# Isso inclui node_modules, código fonte, e quaisquer diretórios como logs, auth_data se estiverem em /app
RUN chown -R node:node /app

# Mudar para o usuário não-root 'node' (que já existe na imagem base node:slim)
USER node

# Expor a porta que a aplicação usa (se houver, descomente e ajuste)
EXPOSE 3000

# Comando para iniciar a aplicação usando PM2 (assumindo que pm2-runtime está nas dependências do package.json)
# e que você tem um ecosystem.config.js
CMD [ "pm2-runtime", "start", "ecosystem.config.js" ]
