const { body, param, query, validationResult } = require('express-validator');
const adModel = require('../models/adModel');

const validateAd = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('image').optional().isURL().withMessage('Image must be a valid URL'),
];

const validateAds = [
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
];

const createAd = [
  ...validateAd,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const ad = await adModel.createAd({ ...req.body, isArchived: false });
      res.status(201).json(ad);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

const getAd = [
  param('id').notEmpty().withMessage('Advertisement ID is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const ad = await adModel.getAd(req.params.id);
      if (!ad || ad.isArchived) {
        return res.status(404).json({ error: 'Advertisement not found or archived' });
      }
      res.json(ad);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

const archiveAd = [
  param('id').notEmpty().withMessage('Advertisement ID is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const ad = await adModel.updateAd(req.params.id, { isArchived: true });
      if (!ad) {
        return res.status(404).json({ error: 'Advertisement not found' });
      }
      res.json({ message: 'Advertisement archived successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

module.exports = {
  createAd,
  getAd,
  archiveAd,
};