const { param, query, validationResult } = require('express-validator');
const chatModel = require('../models/chatModel');

const validateChat = [
  param('chatId').notEmpty().withMessage('Chat ID is required')
];

const validateChats = [
  param('userId').notEmpty().withMessage('User ID is required'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

const getChat = [
  ...validateChat,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const chat = await chatModel.getChat(req.params.chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }
      res.json(chat);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

const getChatsForUser = [
  ...validateChats,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const chats = await chatModel.getChatsForUser(req.params.userId);
      res.json(chats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

module.exports = {
  getChat,
  getChatsForUser
};