const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const chatModel = require('../models/chatModel');
const { body, validationResult } = require('express-validator');
const validateMessage = require('../middlewares/validateMessage');

const validateReadMessages = [
  body('userId').notEmpty().withMessage('User ID is required'),
];

const validateReaction = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('emoji').notEmpty().withMessage('Emoji is required'),
];

router.get('/:chatId', async (req, res) => {
  try {
    const chat = await chatController.getChat(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    res.json(chat);
  } catch (error) {
    console.error('Error in GET /:chatId:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const chats = await chatController.getChatsForUser(req.params.userId);
    res.json(chats);
  } catch (error) {
    console.error('Error in GET /user/:userId:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:chatId/messages', validateMessage, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { senderId, content, image } = req.body;
    const chat = await chatModel.addMessage(req.params.chatId, senderId, content, image || null);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    const message = chat.messages[chat.messages.length - 1];
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.chatId).emit('message', message);
    } else {
      console.warn('Socket.IO instance is not available');
    }
    res.json(chat);
  } catch (error) {
    console.error('Error in POST /:chatId/messages:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
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
    if (io) {
      io.to(chatId).emit('messagesRead', { chatId, messages: chat.messages });
    } else {
      console.warn('Socket.IO instance is not available');
    }
    res.json(chat);
  } catch (error) {
    console.error('Error in PATCH /:chatId/messages/read:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:chatId/messages/:messageId/reactions', validateReaction, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { chatId, messageId } = req.params;
    const { userId, emoji } = req.body;
    const chat = await chatModel.addReactionToMessage(chatId, messageId, userId, emoji);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    const updatedMessage = chat.messages.find(msg => msg.id === messageId);
    if (!updatedMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }
    const io = req.app.get('io');
    if (io) {
      io.to(chatId).emit('messageReaction', { chatId, messageId, reaction: { userId, emoji } });
    } else {
      console.warn('Socket.IO instance is not available');
    }
    res.json(updatedMessage);
  } catch (error) {
    console.error('Error in POST /:chatId/messages/:messageId/reactions:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;