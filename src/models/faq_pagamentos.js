const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const FaqPagamentos = sequelize.define('FaqPagamentos', {
  pergunta: { type: DataTypes.STRING, allowNull: false },
  resposta:  { type: DataTypes.TEXT,   allowNull: false },
}, {
  tableName: 'faqPagamentos',
  timestamps: false,
});

module.exports = FaqPagamentos;
