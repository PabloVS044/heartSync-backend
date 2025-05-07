const { body, param, validationResult } = require('express-validator');
const userModel = require('../models/userModel');

const validateUser = [
  body('name').notEmpty().withMessage('Name is required'),
  body('surname').notEmpty().withMessage('Surname is required'),
  body('email').isEmail().withMessage('Invalid email'),
  body('age').isInt({ min: 18 }).withMessage('Age must be at least 18'),
  body('country').notEmpty().withMessage('Country is required'),
  body('gender').isIn(['male', 'female']).withMessage('Gender must be male or female'),
  body('interests').isArray().withMessage('Interests must be an array'),
  body('photos').isArray().withMessage('Photos must be an array')
];

const validatePreferences = [
  body('minAge').isInt({ min: 18 }).withMessage('Minimum age must be at least 18'),
  body('maxAge').isInt({ min: 18 }).withMessage('Maximum age must be at least 18'),
  body('maxAge').custom((maxAge, { req }) => maxAge >= req.body.minAge).withMessage('Maximum age must be greater than or equal to minimum age')
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
      await userModel.setPreferences(req.params.id, req.body.minAge, req.body.maxAge);
      res.status(200).json({ message: 'Preferences updated' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

const getMatches = [
  param('id').notEmpty().withMessage('User ID is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const matches = await userModel.getMatches(req.params.id);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

module.exports = {
  createUser,
  getUser,
  updateUser,
  deleteUser,
  setPreferences,
  getMatches
};