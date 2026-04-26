# SupportBot — TechStore

Assistente de atendimento ao cliente da TechStore. Responde FAQs sobre prazo de entrega, troca/devolução e formas de pagamento via chat em tempo real. Para dúvidas fora do escopo, abre um ticket de suporte.

---

## Pré-requisitos

- Node.js v22+
- PostgreSQL v18+
- Chave de API do Google Gemini ([obter aqui](https://aistudio.google.com))

---

## Instalação

```bash
npm install
```

---

## Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nome_do_banco
DB_USER=usuario
DB_PASSWORD=senha
GEMINI_API_KEY=sua_chave_aqui
WEBSOCKET_ENABLED=true
```

---

## Banco de Dados

Execute as migrações e popule as tabelas de FAQ:

```bash
npx sequelize-cli db:migrate
node src/database/seed.js
```

---

## Rodando o servidor

```bash
npm run dev
```

O terminal vai exibir:

```
Servidor rodando em http://localhost:3000
Chat disponível em http://localhost:3000/chat.html
```

---

## Usando o chat

Abra **http://localhost:3000/chat.html** no navegador.

O bot responde perguntas sobre:
- Prazo de entrega
- Troca e devolução
- Formas de pagamento

Para dúvidas fora desses tópicos, o bot solicita nome, e-mail e descrição para abrir um ticket.

---

## API REST

A API REST continua disponível em paralelo ao WebSocket.

### Enviar mensagem

```http
POST /api/chat
Content-Type: application/json

{ "mensagem": "Qual o prazo de entrega?" }
```

### Abrir ticket

```http
POST /api/chat/ticket
Content-Type: application/json

{
  "nome": "João Silva",
  "email": "joao@email.com",
  "descricao": "Minha dúvida é..."
}
```

---

## Testes

```bash
npm test
```

---

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta do servidor | `3000` |
| `DB_HOST` | Host do PostgreSQL | — |
| `DB_PORT` | Porta do PostgreSQL | `5432` |
| `DB_NAME` | Nome do banco | — |
| `DB_USER` | Usuário do banco | — |
| `DB_PASSWORD` | Senha do banco | — |
| `GEMINI_API_KEY` | Chave da API do Gemini | — |
| `WEBSOCKET_ENABLED` | Habilita o WebSocket (`true`/`false`) | `true` |
