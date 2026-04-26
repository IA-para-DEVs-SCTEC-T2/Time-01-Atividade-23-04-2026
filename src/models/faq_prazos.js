const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const FaqPrazos = sequelize.define('FaqPrazos', {
  pergunta: { type: DataTypes.STRING, allowNull: false },
  resposta:  { type: DataTypes.TEXT,   allowNull: false },
}, {
  tableName: 'faqPrazos',
  timestamps: false,
});

module.exports = FaqPrazos;
