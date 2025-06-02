const { body, param, query, validationResult } = require('express-validator');
const userModel = require('../models/userModel');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const validateUser = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
  body('age').isInt({ min: 18 }).withMessage('Age must be at least 18'),
];

const validateLogin = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const createUser = [
  ...validateUser,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await userModel.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

const login = [
  ...validateLogin,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { email, password } = req.body;
      const user = await userModel.loginUser(email, password);
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
      res.status(200).json({ token, userId: user.id });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  },
];

const getUserStats = [
  param('id').notEmpty().withMessage('User ID is required'),
  async (req, res) => {
    try {
      const user = await userModel.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const stats = {
        matchesCount: user.matches?.length || 0,
        likesGiven: user.likesGiven?.length || 0,
        likesReceived: user.likesReceived?.length || 0,
        lastActive: user.lastActive,
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

module.exports = {
  createUser,
  login,
  getUserStats,
};