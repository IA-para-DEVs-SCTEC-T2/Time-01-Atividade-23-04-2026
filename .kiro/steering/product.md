---
inclusion: always
---

# SupportBot — TechStore

## Visão Geral

O SupportBot é um assistente de atendimento inicial ao cliente da TechStore. Ele responde FAQs sobre prazo de entrega, troca/devolução e formas de pagamento. Quando não conseguir responder com segurança, abre um ticket automaticamente com nome, e-mail e descrição da dúvida do cliente.

## Objetivos

- Responder FAQs da TechStore de forma confiável e consistente.
- Reduzir o volume de atendimentos manuais.
- Abrir ticket automaticamente para perguntas fora do escopo coberto.

## FAQs Suportadas

| Tópico | Descrição |
|---|---|
| Prazo de entrega | Informar prazos padrão por modalidade de envio |
| Troca e devolução | Política de troca, prazo e condições |
| Formas de pagamento | Métodos aceitos (cartão, boleto, Pix, etc.) |
| Status de pedido | Responder apenas se a informação estiver disponível na base |

## Fluxo de Atendimento

1. Receber mensagem do cliente.
2. Classificar a intenção: FAQ conhecida ou desconhecida.
3. Se FAQ conhecida → responder com base no conteúdo pré-definido.
4. Se desconhecida ou incerta → coletar nome, e-mail e descrição e abrir ticket.

## Regras de Negócio

- O bot **nunca deve inventar** informações — se não souber, abre ticket.
- A abertura de ticket requer: `nome`, `email` e `descricao` (todos obrigatórios).
- Respostas de FAQ devem ser fiéis ao conteúdo cadastrado, sem improviso.
- O bot não resolve casos fora do escopo — apenas registra e encaminha.

## Fora de Escopo

- Cancelamento financeiro complexo.
- Alteração de pedido após faturamento.
- Integração com logística em tempo real.
- Atendimento por voz.
- Resolução de casos jurídicos ou exceções operacionais.
