const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const FaqTrocas = sequelize.define('FaqTrocas', {
  pergunta: { type: DataTypes.STRING, allowNull: false },
  resposta:  { type: DataTypes.TEXT,   allowNull: false },
}, {
  tableName: 'faqTrocas',
  timestamps: false,
});

module.exports = FaqTrocas;
