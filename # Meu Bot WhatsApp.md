# Meu Bot WhatsApp

Bot para WhatsApp com armazenamento de mensagens, comandos simples, controle de acesso e logs.

## Instalação

```bash
npm install
```

## Uso

- Desenvolvimento: `npm run dev`
- Produção (PM2): `npm start`

## Configuração

Edite o arquivo `.env` para ajustar caminhos, nível de log e admins.

## Comandos

- `/ping` — responde "pong"
- `/admin` — responde se o usuário é admin

## Logs

Os logs ficam na pasta definida por `LOGS_DIR`.

## Testes

Adicione testes em `__tests__` e rode com `npm test`.

---

## Segurança

Monitore vulnerabilidades com `npm audit`.
