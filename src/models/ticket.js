const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Ticket = sequelize.define('Ticket', {
  nome:      { type: DataTypes.STRING,    allowNull: false },
  email:     { type: DataTypes.STRING,    allowNull: false },
  descricao: { type: DataTypes.TEXT,      allowNull: false },
  criado_em: { type: DataTypes.DATE,      allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'tickets',
  timestamps: false,
});

module.exports = Ticket;
