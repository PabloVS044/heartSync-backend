const { body, param, query, validationResult } = require('express-validator');
const userModel = require('../models/userModel');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const validateUser = [
  body('name').notEmpty().withMessage('Name is required'),
  body('surname').notEmpty().withMessage('Surname is required'),
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
  body('age').isInt({ min: 18 }).withMessage('Age must be at least 18'),
  body('country').notEmpty().withMessage('Country is required'),
  body('gender').isIn(['male', 'female']).withMessage('Gender must be male or female'),
  body('interests').isArray().withMessage('Interests must be an array'),
  body('photos').isArray().withMessage('Photos must be an array'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be 500 characters or less'),
  body('minAgePreference').optional().isInt({ min: 18 }).withMessage('Minimum age preference must be at least 18'),
  body('maxAgePreference').optional().isInt({ min: 18 }).withMessage('Maximum age preference must be at least 18'),
  body('internationalMode').optional().isBoolean().withMessage('International mode must be a boolean')
];

const validateProfileUpdate = [
  body('age').optional().isInt({ min: 18 }).withMessage('Age must be at least 18'),
  body('country').optional().notEmpty().withMessage('Country is required'),
  body('gender').optional().isIn(['male', 'female']).withMessage('Gender must be male or female'),
  body('interests').optional().isArray().withMessage('Interests must be an array'),
  body('photos').optional().isArray().withMessage('Photos must be an array'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be 500 characters or less'),
  body('minAgePreference').optional().isInt({ min: 18 }).withMessage('Minimum age preference must be at least 18'),
  body('maxAgePreference').optional().isInt({ min: 18 }).withMessage('Maximum age preference must be at least 18'),
  body('internationalMode').optional().isBoolean().withMessage('International mode must be a boolean')
];

const validatePreferences = [
  body('minAge').isInt({ min: 18 }).withMessage('Minimum age must be at least 18'),
  body('maxAge').isInt({ min: 18 }).withMessage('Maximum age must be at least 18'),
  body('maxAge').custom((maxAge, { req }) => maxAge >= req.body.minAge).withMessage('Maximum age must be greater than or equal to minimum age')
];

const validateMatches = [
  param('id').notEmpty().withMessage('User ID is required'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

const validateLike = [
  param('id').notEmpty().withMessage('User ID is required'),
  param('targetId').notEmpty().withMessage('Target User ID is required')
];

const validateLogin = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const validateGoogleLogin = [
  body('token').notEmpty().withMessage('Google token is required')
];

const validateUsers = [
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
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
  }
];

const googleLogin = [
  ...validateGoogleLogin,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { token } = req.body;
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      const { sub: googleId, email, name, picture } = payload;

      const user = await userModel.createOrUpdateGoogleUser({ googleId, email, name, picture });
      const jwtToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

      res.status(200).json({ token: jwtToken, userId: user.id });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }
];

const updateUserProfile = [
  param('id').notEmpty().withMessage('User ID is required'),
  ...validateProfileUpdate,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await userModel.updateUserProfile(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

const getUser = [
  param('id').notEmpty().withMessage('User ID is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await userModel.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

const getUsers = [
  ...validateUsers,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const skip = parseInt(req.query.skip) || 0;
      const limit = parseInt(req.query.limit) || 10;
      const users = await userModel.getUsers(skip, limit);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

const updateUser = [
  param('id').notEmpty().withMessage('User ID is required'),
  ...validateUser,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await userModel.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

const deleteUser = [
  param('id').notEmpty().withMessage('User ID is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const success = await userModel.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

const setPreferences = [
  param('id').notEmpty().withMessage('User ID is required'),
  ...validatePreferences,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const success = await userModel.setPreferences(req.params.id, req.body.minAge, req.body.maxAge);
      if (!success) {
        return res.status(400).json({ error: 'Invalid age preferences for user gender' });
      }
      res.status(200).json({ message: 'Preferences updated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

const addLike = [
  ...validateLike,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const result = await userModel.addLike(req.params.id, req.params.targetId);
      res.status(200).json({
        message: 'Like added',
        isMatched: result.isMatched
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

const getMatches = [
  ...validateMatches,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const skip = parseInt(req.query.skip) || 0;
      const limit = parseInt(req.query.limit) || 10;
      const matches = await userModel.getMatches(req.params.id, skip, limit);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
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

      // Generate JWT
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

      res.status(200).json({ token, userId: user.id });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }
];

module.exports = {
  createUser,
  googleLogin,
  updateUserProfile,
  getUser,
  getUsers,
  updateUser,
  deleteUser,
  setPreferences,
  addLike,
  getMatches,
  login
};