const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middlewares/auth'); // Middleware ficticio

router.get('/user/:userId', authenticate, chatController.getChatsForUser);

module.exports = router;