const { param, query, body, validationResult } = require('express-validator');
const chatModel = require('../models/chatModel');
const logger = require('winston'); // Suponiendo que usas Winston para logging

const validateChats = [
  param('userId').notEmpty().withMessage('User ID is required'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
];

const validateReadMessages = [
  body('userId').notEmpty().withMessage('User ID is required'),
];

const getChat = [
  async (req, res) => {
    try {
      logger.info(`Fetching chat with ID: ${req.params.chatId}`);
      const chat = await chatModel.getChat(req.params.chatId);
      if (!chat) {
        logger.warn(`Chat not found: ${req.params.chatId}`);
        return res.status(404).json({ error: 'Chat not found' });
      }
      res.json(chat);
    } catch (error) {
      logger.error(`Error fetching chat ${req.params.chatId}: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  },
];

const getChatsForUser = [
  ...validateChats,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      logger.info(`Fetching chats for user: ${req.params.userId}`);
      const chats = await chatModel.getChatsForUser(req.params.userId);
      res.json(chats);
    } catch (error) {
      logger.error(`Error fetching chats for user ${req.params.userId}: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  },
];

const markMessagesAsRead = [
  ...validateReadMessages,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { chatId } = req.params;
      const { userId } = req.body;
      logger.info(`Marking messages as read for chat ${chatId} by user ${userId}`);
      const chat = await chatModel.markMessagesAsRead(chatId, userId);
      if (!chat) {
        logger.warn(`Chat not found: ${chatId}`);
        return res.status(404).json({ error: 'Chat not found' });
      }
      res.json(chat);
    } catch (error) {
      logger.error(`Error marking messages as read for chat ${req.params.chatId}: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  },
];

module.exports = {
  getChat,
  getChatsForUser,
  markMessagesAsRead,
};