const { body } = require('express-validator');

const validateMessage = [
  body('senderId').isUUID().withMessage('Sender ID must be a valid UUID'),
  body('content').isString().notEmpty().withMessage('Content is required'),
  body('image').optional().isString().withMessage('Image must be a valid URL if provided')
];

module.exports = validateMessage;