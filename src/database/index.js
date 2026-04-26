require('dotenv').config();
const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(config.database, config.username, config.password, config);

module.exports = sequelize;

require('../models/faq_prazos');
require('../models/faq_trocas');
require('../models/faq_pagamentos');
require('../models/ticket');
