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
    const message = chat.messages[chat.messages.length - 1];
    const io = req.app.get('io');
    io?.to(req.params.chatId).emit('message', message);
    res.json(chat);
  } catch (error) {
    console.error('Error adding message:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:chatId/messages/read', validateReadMessages, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { chatId } = req.params;
    const { userId } = req.body;
    const chat = await chatModel.markMessagesAsRead(chatId, userId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    const io = req.app.get('io');
    io?.to(chatId).emit('messagesRead', { chatId, messages: chat.messages });
    res.json(chat);
  } catch (error) {
    console.error('Error marking messages as read:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;