const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { body, validationResult } = require('express-validator');

const validateMessage = [
  body('senderId').notEmpty().withMessage('Sender ID is required'),
  body('content').notEmpty().withMessage('Message content is required'),
];

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
    const { senderId, content } = req.body;
    const chat = await chatModel.addMessage(req.params.chatId, senderId, content);
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:chatId/messages/read', validateReadMessages, chatController.markMessagesAsRead);

module.exports = router;