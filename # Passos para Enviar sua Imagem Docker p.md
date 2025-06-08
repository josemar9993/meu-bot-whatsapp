# Passos para Enviar sua Imagem Docker para o Docker Hub

Siga estes passos no seu terminal, no diretório `c:\Users\supor\meu-bot-whatsapp`.

1.  **Faça login no Docker Hub (Se necessário):**
    Você já está logado no site do Docker Hub. Se ainda não fez login no Docker Hub pelo seu terminal, execute o comando abaixo.
    ```bash
    docker login
    ```
    (Se você já executou `docker login` recentemente e ele ainda é válido, pode pular este comando específico).

2.  **Marque (Tag) sua imagem Docker local:**
    Antes de enviar, você precisa marcar sua imagem `meu-bot-whatsapp` com seu nome de usuário do Docker Hub (`schieste87`).
    ```bash
    docker tag meu-bot-whatsapp:latest schieste87/meu-bot-whatsapp:latest
    ```
    *Explicação:*
    *   `meu-bot-whatsapp:latest` é o nome e a tag da sua imagem local.
    *   `schieste87/meu-bot-whatsapp:latest` é o nome completo da imagem no Docker Hub, consistindo em `[SEU_NOME_DE_USUARIO]/[NOME_DO_REPOSITORIO]:[TAG]`. Usamos `meu-bot-whatsapp` como nome do repositório e `latest` como tag.

3.  **Envie (Push) sua imagem para o Docker Hub:**
    Agora, envie a imagem marcada para o Docker Hub.
    ```bash
    docker push schieste87/meu-bot-whatsapp:latest
    ```
    Após a conclusão deste comando, sua imagem Docker estará armazenada no Docker Hub no repositório `schieste87/meu-bot-whatsapp` e pronta para ser usada por serviços de hospedagem na nuvem. Você poderá vê-la na sua página de repositórios no Docker Hub.

**Próximos Passos (após enviar a imagem):**
Consulte o arquivo `DEPLOYMENT_GUIDE.md` para escolher um provedor de hospedagem e implantar seu bot usando a imagem `schieste87/meu-bot-whatsapp:latest`. Lembre-se especialmente da seção sobre persistência de sessão para `whatsapp-web.js`.
