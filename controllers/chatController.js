const { param, body, validationResult } = require('express-validator');
const chatModel = require('../models/chatModel');

const getChatsForUser = [
  param('userId').notEmpty().withMessage('User ID is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const chats = await chatModel.getChatsForUser(req.params.userId);
      const chatsWithUnreadCount = chats.map(chat => ({
        ...chat,
        unreadCount: chat.messages?.filter(msg => !msg.isRead && msg.senderId !== req.params.userId).length || 0,
      }));
      res.json(chatsWithUnreadCount);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

module.exports = {
  getChatsForUser,
};