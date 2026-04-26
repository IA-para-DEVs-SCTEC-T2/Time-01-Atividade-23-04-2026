'use strict';

const express = require('express');

const gemini_client = require('../utils/gemini_client');
const { criar_classificador } = require('../dominios/chat/classificador');
const faq_repository = require('../dominios/chat/faq_repository');
const { criar_chat_service } = require('../dominios/chat/chat_service');
const ticket_service = require('../dominios/ticket/ticket_service');
const { criar_chat_controller } = require('../dominios/chat/chat_controller');

const classificador = criar_classificador(gemini_client);
const chat_service = criar_chat_service(classificador, faq_repository);
const controller = criar_chat_controller(chat_service, ticket_service);

const router = express.Router();

router.post('/chat', controller.post_chat);
router.post('/chat/ticket', controller.post_ticket);

module.exports = router;
