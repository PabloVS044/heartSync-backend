const { body, param, validationResult } = require('express-validator');
const userModel = require('../models/userModel');

const validateUser = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Invalid email'),
  body('age').isInt({ min: 18 }).withMessage('Age must be at least 18'),
];

const validateVerifyEmail = [
  param('token').notEmpty().withMessage('Verification token is required'),
];

const createUser = [
  ...validateUser,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await userModel.createUser({ ...req.body, isEmailVerified: false });
      // Simulación de envío de email de verificación
      const verificationToken = 'mockToken'; // En producción, generar y enviar token
      res.status(201).json({ ...user, verificationToken });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

const verifyEmail = [
  ...validateVerifyEmail,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await userModel.verifyEmail(req.params.token);
      if (!user) {
        return res.status(404).json({ error: 'Invalid or expired token' });
      }
      res.json({ message: 'Email verified successfully', user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

module.exports = {
  createUser,
  verifyEmail,
};