'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('faqTrocas', {
      id:       { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pergunta: { type: Sequelize.STRING,  allowNull: false },
      resposta: { type: Sequelize.TEXT,    allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('faqTrocas');
  },
};
