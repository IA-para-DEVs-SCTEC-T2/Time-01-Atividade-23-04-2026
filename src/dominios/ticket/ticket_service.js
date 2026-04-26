'use strict';

const Ticket = require('../../models/ticket');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class DatabaseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function criar_ticket({ nome, email, descricao }) {
  const campos_ausentes = [];

  if (!nome || typeof nome !== 'string' || nome.trim() === '') campos_ausentes.push('nome');
  if (!email || typeof email !== 'string' || email.trim() === '') campos_ausentes.push('email');
  if (!descricao || typeof descricao !== 'string' || descricao.trim() === '') campos_ausentes.push('descricao');

  if (campos_ausentes.length > 0) {
    throw new ValidationError('Os campos nome, email e descricao são obrigatórios.');
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    throw new ValidationError('O campo email deve conter um endereço de e-mail válido.');
  }

  try {
    const ticket = await Ticket.create({
      nome: nome.trim(),
      email: email.trim(),
      descricao: descricao.trim(),
    });
    return { id: ticket.id };
  } catch (err) {
    console.error('Erro ao persistir ticket:', err);
    throw new DatabaseError('Erro interno ao registrar o ticket. Tente novamente.');
  }
}

module.exports = { criar_ticket, ValidationError, DatabaseError };
