const express = require('express');

const chat_router = require('./chat_router');

const router = express.Router();

router.use(chat_router);

module.exports = router;
