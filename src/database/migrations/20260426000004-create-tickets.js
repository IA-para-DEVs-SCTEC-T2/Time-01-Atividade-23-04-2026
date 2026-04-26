'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tickets', {
      id:        { type: Sequelize.INTEGER,   primaryKey: true, autoIncrement: true },
      nome:      { type: Sequelize.STRING,    allowNull: false },
      email:     { type: Sequelize.STRING,    allowNull: false },
      descricao: { type: Sequelize.TEXT,      allowNull: false },
      criado_em: { type: Sequelize.DATE,      allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('tickets');
  },
};
