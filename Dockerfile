FROM node:18-bookworm-slim

# Defina o diretório de trabalho no contêiner
WORKDIR /app

# Instale as dependências do sistema operacional necessárias para o Puppeteer (usado pelo whatsapp-web.js)
# e para o Google Chrome.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    gnupg \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
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
    --fix-missing && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Copie os arquivos de definição de dependências
COPY package.json package-lock.json* ecosystem.config.js ./

# Instale as dependências da aplicação
# Use --omit=dev para não instalar devDependencies em produção
RUN npm install --omit=dev --no-cache

# Copie o restante do código da aplicação para o diretório de trabalho
COPY . .

# Crie diretórios para dados de autenticação e logs, se necessário (embora para RemoteAuth com GCS, auth_data pode não ser usado aqui)
RUN mkdir -p /app/auth_data /app/logs && chown -R node:node /app

# Mude para o usuário não-root 'node'
USER node

# Exponha a porta que sua aplicação pode usar (se houver um servidor Express, por exemplo)
# ENV PORT=8080
# EXPOSE ${PORT}

# Comando para executar a aplicação usando pm2-runtime
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]