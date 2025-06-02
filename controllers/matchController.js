const { param, query, validationResult } = require('express-validator');
const matchModel = require('../models/matchModel');

const validateSuggestions = [
  param('userId').notEmpty().withMessage('User ID is required'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
];

const suggestMatches = [
  ...validateSuggestions,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const limit = parseInt(req.query.limit) || 5;
      const suggestions = await matchModel.getMatchSuggestions(req.params.userId, limit);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

module.exports = {
  suggestMatches,
};