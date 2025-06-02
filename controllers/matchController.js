const { param, query, validationResult } = require('express-validator');
const matchModel = require('../models/matchModel');

const validateMatch = [
  param('matchId').notEmpty().withMessage('Match ID is required'),
];

const validateMatches = [
  param('userId').notEmpty().withMessage('User ID is required'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
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
      res.json(match);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
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
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };
      const matches = await matchModel.getMatchesForUser(req.params.userId, skip, limit, filters);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

module.exports = {
  getMatch,
  getMatchesForUser,
};