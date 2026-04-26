# Plano de Implementação: SupportBot FAQ

## Overview

Implementação incremental da API REST do SupportBot em Python/FastAPI, seguindo a arquitetura em camadas definida no design. Cada tarefa constrói sobre a anterior, terminando com a integração completa dos componentes.

## Tasks

- [x] 1. Estrutura do projeto e configuração base
  - Criar a estrutura de diretórios conforme `structure.md`: `app/api/`, `app/services/`, `app/repositories/`, `app/models/`, `app/prompts/`, `app/utils/`, `data/`, `tests/`
  - Criar `requirements.txt` com dependências: `fastapi`, `uvicorn`, `pydantic[email]`, `pydantic-settings`, `httpx`, `python-dotenv`, `pytest`, `pytest-asyncio`, `pytest-mock`, `hypothesis`
  - Criar `.env.example` com `ANTHROPIC_API_KEY=`, `CONFIDENCE_THRESHOLD=0.7`, `FAQS_PATH=data/faqs.json`, `LOG_LEVEL=INFO`
  - Criar `app/config.py` com `Settings(BaseSettings)` carregando as variáveis de ambiente
  - _Requirements: 2.4, 4.1_

- [x] 2. Modelos de dados (Pydantic)
  - [x] 2.1 Criar `app/models/faq.py` com `FAQ(BaseModel)`: `id`, `category`, `question`, `answer`, `keywords: list[str]`
    - _Requirements: 4.1, 4.5_

  - [x] 2.2 Escrever property test para round-trip de serialização de FAQ
    - **Property 8: Round-trip de serialização de FAQ preserva dados**
    - **Validates: Requirements 4.5**
    - Usar `hypothesis` com `st.builds(FAQ, ...)` para gerar FAQs aleatórias válidas
    - Verificar que `FAQ.model_validate(faq.model_dump()) == faq`
    - Arquivo: `tests/test_faq_service.py`

  - [x] 2.3 Criar `app/models/message.py` com `ChatRequest` e `ChatResponse`
    - `ChatRequest(message: str = Field(..., min_length=1))`
    - `ChatResponse(answer: str, confidence: float, escalated: bool)`
    - _Requirements: 1.4, 1.5_

  - [x] 2.4 Criar `app/models/ticket.py` com `TicketRequest`, `Ticket` e `TicketResponse`
    - `TicketRequest(name: str, email: EmailStr, description: str)` com `min_length=1` nos campos de texto
    - `Ticket(ticket_id: str, name: str, email: str, description: str, created_at: datetime)`
    - `TicketResponse(ticket_id: str, message: str)`
    - _Requirements: 3.2, 3.5, 3.6, 3.7_

- [x] 3. Logger estruturado
  - [x] 3.1 Criar `app/utils/logger.py` com logger que emite JSON contendo `timestamp`, `level`, `service` e `message`
    - _Requirements: 5.4_

  - [x] 3.2 Escrever property test para estrutura dos logs
    - **Property 9: Logs estruturados contêm campos obrigatórios**
    - **Validates: Requirements 5.4**
    - Gerar eventos de log aleatórios e verificar que o output é JSON válido com os 4 campos obrigatórios
    - Arquivo: `tests/test_chat.py`

- [x] 4. FAQ Repository e base de dados
  - [x] 4.1 Criar `data/faqs.json` com FAQs iniciais cobrindo: prazo de entrega, troca e devolução, formas de pagamento e status de pedido
    - _Requirements: 4.2_

  - [x] 4.2 Criar `app/repositories/faq_repository.py` com `load_faqs(path: str) -> list[FAQ]`
    - Lançar `FAQLoadError` (com mensagem descritiva) se arquivo não encontrado ou JSON inválido
    - _Requirements: 4.1, 4.3, 4.4_

- [x] 5. FAQ Service
  - [x] 5.1 Criar `app/services/faq_service.py` com `find_relevant_faq(message: str, faqs: list[FAQ]) -> FAQ | None`
    - Implementar matching por palavras-chave usando o campo `keywords` de cada FAQ
    - Retornar `None` se nenhuma FAQ for suficientemente relevante
    - _Requirements: 1.2_

  - [x] 5.2 Escrever property test para FAQ Service
    - **Property 4: FAQ_Service retorna apenas FAQs da lista fornecida**
    - **Validates: Requirements 1.2**
    - Usar `st.lists(st.builds(FAQ, ...))` + `st.text()` para mensagem
    - Verificar que resultado é `None` ou pertence à lista de entrada
    - Arquivo: `tests/test_faq_service.py`

- [x] 6. Exceções customizadas
  - Criar `app/utils/exceptions.py` com hierarquia: `SupportBotError`, `LLMUnavailableError`, `FAQLoadError`, `TicketPersistenceError`
  - _Requirements: 1.6, 4.3, 4.4_

- [x] 7. LLM Service e prompts
  - [x] 7.1 Criar `app/prompts/system_prompt.txt` (com FAQ relevante) e `app/prompts/fallback_prompt.txt` (sem FAQ)
    - Ambos os prompts devem instruir o LLM a retornar JSON `{"answer": "...", "confidence": 0.0}`
    - _Requirements: 1.3_

  - [x] 7.2 Criar `app/services/llm_service.py` com `async def generate_response(message: str, faq: FAQ | None) -> LLMResult`
    - `LLMResult(answer: str, raw_response: dict)`
    - Usar `httpx.AsyncClient` para chamar Claude Haiku 4.5
    - Lançar `LLMUnavailableError` em timeout ou falha de conexão
    - _Requirements: 1.3, 1.6_

- [x] 8. Classifier Service
  - [x] 8.1 Criar `app/services/classifier_service.py` com `calculate_confidence(llm_result: LLMResult) -> float`
    - Extrair `confidence` do JSON retornado pelo LLM
    - Normalizar via `max(0.0, min(1.0, raw_score))`
    - _Requirements: 2.1_

  - [x] 8.2 Escrever property test para lógica de escalation
    - **Property 3: Confidence_Score determina escalation de forma consistente**
    - **Validates: Requirements 2.2, 2.3**
    - Usar `st.floats(0.0, 1.0)` para score e threshold
    - Verificar invariante: `score >= threshold → escalated=False`, `score < threshold → escalated=True`
    - Arquivo: `tests/test_chat.py`

- [ ] 9. Ticket Repository e Ticket Service
  - [x] 9.1 Criar `app/repositories/ticket_repository.py` com `save_ticket(ticket: Ticket) -> str` e `get_ticket(ticket_id: str) -> Ticket | None`
    - Persistência em memória (dict); `ticket_id` gerado via `uuid4()`
    - _Requirements: 3.3_

  - [x] 9.2 Escrever property test para unicidade de ticket_id
    - **Property 5: Tickets criados possuem identificadores únicos**
    - **Validates: Requirements 3.3**
    - Usar `st.lists(st.builds(TicketRequest, ...), min_size=2)` e verificar que todos os `ticket_id` são distintos
    - Arquivo: `tests/test_ticket_service.py`

  - [x] 9.3 Criar `app/services/ticket_service.py` com `create_ticket(name: str, email: str, description: str) -> Ticket`
    - Delegar persistência ao `TicketRepository`
    - _Requirements: 3.2, 3.3_

- [x] 10. Checkpoint — testes unitários dos serviços
  - Garantir que todos os testes até aqui passam, ask the user if questions arise.

- [ ] 11. Chat API
  - [x] 11.1 Criar `app/api/routes_chat.py` com `POST /chat`
    - Orquestrar: `FAQService.find_relevant_faq` → `LLMService.generate_response` → `ClassifierService.calculate_confidence`
    - Definir `escalated = confidence < settings.confidence_threshold`
    - Registrar log com mensagem recebida, confidence e ação tomada
    - _Requirements: 1.1, 1.4, 2.2, 2.3, 5.1_

  - [x] 11.2 Escrever property test para campos obrigatórios na resposta do chat
    - **Property 1: Resposta do chat contém campos obrigatórios com valores válidos**
    - **Validates: Requirements 1.4, 2.1**
    - Usar `st.text(min_size=1).filter(lambda s: s.strip())` para mensagens; mockar `LLMService`
    - Verificar que `answer` é string não vazia e `confidence` está em [0.0, 1.0]
    - Arquivo: `tests/test_chat.py`

  - [x] 11.3 Escrever property test para rejeição de whitespace no chat
    - **Property 2: Mensagens compostas apenas de whitespace são rejeitadas**
    - **Validates: Requirements 1.5**
    - Usar `st.text(alphabet=st.characters(whitelist_categories=('Zs',)))` e strings vazias
    - Verificar que o endpoint retorna HTTP 422
    - Arquivo: `tests/test_chat.py`

- [ ] 12. Ticket API
  - [x] 12.1 Criar `app/api/routes_ticket.py` com `POST /ticket`
    - Acionar `TicketService.create_ticket` e retornar HTTP 201
    - Registrar log com `ticket_id` e e-mail do cliente
    - _Requirements: 3.2, 3.4, 5.2_

  - [x] 12.2 Escrever property test para criação de ticket válido
    - **Property 6: Criação de ticket válido retorna estrutura completa**
    - **Validates: Requirements 3.4**
    - Usar `st.builds(TicketRequest, ...)` com dados válidos; verificar HTTP 201, `ticket_id` e `message` não vazios
    - Arquivo: `tests/test_ticket_service.py`

  - [x] 12.3 Escrever property test para rejeição de campos inválidos no ticket
    - **Property 7: Campos obrigatórios do ticket rejeitam whitespace**
    - **Validates: Requirements 3.5, 3.6, 3.7**
    - Testar `name`/`description` com whitespace e `email` inválido; verificar HTTP 422
    - Arquivo: `tests/test_ticket_service.py`

- [x] 13. Aplicação principal e handlers de erro
  - Criar `app/main.py` com instância FastAPI, registro das rotas e handlers globais de exceção
  - Carregar FAQs via `FAQRepository` na inicialização; encerrar com `sys.exit(1)` em `FAQLoadError`
  - Handler para `LLMUnavailableError` → 503; handler genérico → 500 com log de stack trace
  - _Requirements: 1.6, 4.3, 4.4, 5.3_

- [ ] 14. Testes de exemplo (caminho feliz e fallback)
  - [x] 14.1 Escrever testes de exemplo em `tests/test_chat.py`
    - Caminho feliz: mensagem válida → 200 com `answer` e `confidence`
    - Escalation: score < threshold → `escalated=True` com instrução ao cliente
    - LLM indisponível → 503
    - Mensagem vazia/whitespace → 422

  - [x] 14.2 Escrever testes de exemplo em `tests/test_faq_service.py`
    - FAQ encontrada por keyword → retorna FAQ correta
    - Nenhuma keyword coincide → retorna `None`

  - [x] 14.3 Escrever testes de exemplo em `tests/test_ticket_service.py`
    - Dados válidos → 201 com `ticket_id`
    - Campos ausentes/inválidos → 422

- [x] 15. Checkpoint final — todos os testes passando
  - Garantir que todos os testes passam, ask the user if questions arise.

## Notes

- Tasks marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Todos os testes devem mockar o `LLMService`; nenhum teste deve chamar a API real do Claude
- Cada property test deve incluir o comentário `# Feature: supportbot-faq, Property N: <texto>`
- O `TicketRepository` usa dict em memória; a interface foi desenhada para fácil substituição por banco de dados
