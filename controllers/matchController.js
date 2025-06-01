const { param, query, validationResult } = require('express-validator');
const matchModel = require('../models/matchModel');

const validateMatch = [
  param('matchId').notEmpty().withMessage('Match ID is required')
];

const validateMatches = [
  param('userId').notEmpty().withMessage('User ID is required'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

const getMatch = [
  ...validateMatch,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const match = await matchModel.getMatch(req.params.matchId);
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }
      res.json(match); // Incluye match, users y chat
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

const getMatchesForUser = [
  ...validateMatches,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const skip = parseInt(req.query.skip) || 0;
      const limit = parseInt(req.query.limit) || 10;
      const matches = await matchModel.getMatchesForUser(req.params.userId, skip, limit);
      res.json(matches); // Incluye match, otherUser y chat
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

module.exports = {
  getMatch,
  getMatchesForUser
};