---
inclusion: always
---

# SupportBot — TechStore

## Visão Geral

O SupportBot é um assistente de atendimento inicial ao cliente da TechStore. Ele responde FAQs sobre prazo de entrega, troca/devolução e formas de pagamento via API REST e via WebSocket em tempo real. Quando não conseguir responder com segurança, abre um ticket com nome, e-mail e descrição da dúvida do cliente.

## Objetivos

- Responder FAQs da TechStore de forma confiável e consistente.
- Reduzir o volume de atendimentos manuais.
- Abrir ticket automaticamente para perguntas fora do escopo coberto.
- Oferecer atendimento em tempo real via WebSocket com interface web amigável.

## FAQs Suportadas

| Tópico | Descrição |
|---|---|
| Prazo de entrega | Informar prazos padrão por modalidade de envio |
| Troca e devolução | Política de troca, prazo e condições |
| Formas de pagamento | Métodos aceitos (cartão, boleto, Pix, etc.) |
| Status de pedido | Responder apenas se a informação estiver disponível na base |

## Fluxo de Atendimento

1. Receber mensagem do cliente (REST ou WebSocket).
2. Classificar a intenção via Gemini: FAQ conhecida ou desconhecida.
3. Se FAQ conhecida → buscar resposta no banco e retornar ao cliente.
4. Se desconhecida → Gemini gera resposta conversacional e amigável direcionando ao FAQ; se o cliente quiser abrir ticket, coleta nome, e-mail e descrição.

## Regras de Negócio

- O bot **nunca deve inventar** informações de FAQ — respostas vêm sempre do banco de dados.
- Para intenções desconhecidas, o Gemini gera uma resposta natural (máximo 3 linhas) que reconhece a mensagem do cliente e direciona ao FAQ disponível.
- A abertura de ticket requer: `nome`, `email` e `descricao` (todos obrigatórios).
- Respostas de FAQ devem ser fiéis ao conteúdo cadastrado, sem improviso.
- Nenhum erro encerra a sessão WebSocket — o cliente pode continuar enviando mensagens.

## Canais de Atendimento

- **REST**: `POST /api/chat` e `POST /api/chat/ticket`
- **WebSocket**: `ws://host/ws/chat` — protocolo JSON com campo `tipo`
- **Interface Web**: `http://host/chat.html` — cliente HTML servido estaticamente

## Fora de Escopo

- Cancelamento financeiro complexo.
- Alteração de pedido após faturamento.
- Integração com logística em tempo real.
- Atendimento por voz.
- Resolução de casos jurídicos ou exceções operacionais.
