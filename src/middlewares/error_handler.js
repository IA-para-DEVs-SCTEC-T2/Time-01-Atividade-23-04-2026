function error_handler(err, req, res, next) {
  const status = err.status || 500;
  const response = {
    message: err.message || 'Erro interno do servidor',
    status,
  };

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

module.exports = error_handler;
