const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const router = require('./routers/index');
const error_handler = require('./middlewares/error_handler');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(helmet());

app.use('/api', router);

app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

app.use(error_handler);

module.exports = app;
