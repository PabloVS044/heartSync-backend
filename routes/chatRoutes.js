const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const chatModel = require('../models/chatModel');
const { body, validationResult } = require('express-validator');
const validateMessage = require('../middlewares/validateMessage');

const validateReadMessages = [
  body('userId').notEmpty().withMessage('User ID is required'),
];

router.get('/:chatId', chatController.getChat);
router.get('/user/:userId', chatController.getChatsForUser);
router.post('/:chatId/messages', validateMessage, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { senderId, content, image } = req.body;
    const chat = await chatModel.addMessage(req.params.chatId, senderId, content, image || null);
    res.json(chat);
  } catch (error) {
    console.error('Error in POST /:chatId/messages:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:chatId/messages/read', validateReadMessages, chatController.markMessagesAsRead);

module.exports = router;