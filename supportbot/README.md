# SupportBot FAQ

API REST de atendimento inicial ao cliente da TechStore. Responde perguntas frequentes via LLM (Claude Haiku 4.5) e abre tickets automaticamente quando a confiança na resposta está abaixo do threshold configurado.

## Funcionalidades

- Responde FAQs em linguagem natural via `POST /chat`
- Avalia a confiança da resposta e escala para atendimento humano quando necessário
- Abre tickets com nome, e-mail e descrição via `POST /ticket`
- Logs estruturados em JSON com `timestamp`, `level`, `service` e `message`

## Requisitos

- Python 3.11+
- Chave de API da Anthropic

## Instalação

```bash
pip install -r requirements.txt
```

Copie o arquivo de exemplo e preencha as variáveis:

```bash
cp .env.example .env
```

```env
ANTHROPIC_API_KEY=sua_chave_aqui
CONFIDENCE_THRESHOLD=0.7
FAQS_PATH=data/faqs.json
LOG_LEVEL=INFO
```

## Executando

```bash
uvicorn app.main:app --reload
```

A API estará disponível em `http://localhost:8000`.

## Endpoints

### POST /chat

Envia uma pergunta e recebe uma resposta baseada nas FAQs.

**Request:**
```json
{ "message": "Qual o prazo de entrega?" }
```

**Response 200:**
```json
{
  "answer": "O prazo padrão é de 5 a 10 dias úteis.",
  "confidence": 0.92,
  "escalated": false
}
```

Quando `escalated: true`, o cliente deve fornecer seus dados via `POST /ticket`.

---

### POST /ticket

Registra um ticket de atendimento humano.

**Request:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "description": "Preciso de ajuda com meu pedido #1234"
}
```

**Response 201:**
```json
{
  "ticket_id": "3f2a1b...",
  "message": "Ticket registrado com sucesso. Nossa equipe entrará em contato em breve."
}
```

## Estrutura do projeto

```
supportbot/
├── app/
│   ├── main.py              # Instância FastAPI e handlers globais
│   ├── config.py            # Configurações via variáveis de ambiente
│   ├── api/
│   │   ├── routes_chat.py   # POST /chat
│   │   └── routes_ticket.py # POST /ticket
│   ├── services/
│   │   ├── faq_service.py       # Busca FAQ por keywords
│   │   ├── llm_service.py       # Comunicação com Claude Haiku 4.5
│   │   ├── classifier_service.py # Calcula confidence score
│   │   └── ticket_service.py    # Criação de tickets
│   ├── repositories/
│   │   ├── faq_repository.py    # Carrega data/faqs.json
│   │   └── ticket_repository.py # Persistência em memória
│   ├── models/
│   │   ├── faq.py
│   │   ├── message.py
│   │   └── ticket.py
│   ├── prompts/
│   │   ├── system_prompt.txt    # Prompt com FAQ relevante
│   │   └── fallback_prompt.txt  # Prompt sem FAQ
│   └── utils/
│       ├── logger.py        # Logger JSON estruturado
│       └── exceptions.py    # Hierarquia de exceções
├── data/
│   └── faqs.json            # Base de FAQs editável
├── tests/
│   ├── test_chat.py
│   ├── test_faq_service.py
│   └── test_ticket_service.py
├── .env.example
└── requirements.txt
```

## Testes

```bash
pytest tests/ -q
```

Os testes cobrem caminhos felizes, escalation, falhas de LLM e validações de entrada. Nenhum teste faz chamadas reais à API do Claude — o `LLMService` é sempre mockado.

## Adicionando FAQs

Edite `data/faqs.json` seguindo o formato:

```json
[
  {
    "id": "faq-001",
    "category": "entrega",
    "question": "Qual o prazo de entrega?",
    "answer": "O prazo padrão é de 5 a 10 dias úteis.",
    "keywords": ["prazo", "entrega", "quando", "chega"]
  }
]
```

Reinicie o servidor após editar o arquivo.
