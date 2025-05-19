const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.get('/:chatId', chatController.getChat);
router.get('/user/:userId', chatController.getChatsForUser);

module.exports = router;