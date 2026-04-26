require('dotenv').config();

const sequelize = require('./database/index');
const app = require('./server');

const port = process.env.PORT || 3000;

sequelize.authenticate()
  .then(() => {
    app.listen(port, () => {
      console.log(`Servidor escutando na porta ${port}`);
    });
  })
  .catch((error) => {
    console.error('Falha ao conectar ao banco de dados:', error);
    process.exit(1);
  });
