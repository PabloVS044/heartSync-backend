const { body, param, query, validationResult } = require('express-validator');
const adModel = require('../models/adModel');

const validateAd = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('image').optional().isURL().withMessage('Image must be a valid URL'),
  body('targetedInterests').isArray().withMessage('Targeted interests must be an array'),
  body('targetedInterests.*').isString().withMessage('Each interest must be a string')
];

const validateAds = [
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

const validateUserAds = [
  param('userId').notEmpty().withMessage('User ID is required'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

const createAd = [
  ...validateAd,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const ad = await adModel.createAd(req.body);
      res.status(201).json(ad);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
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
      if (!ad) {
        return res.status(404).json({ error: 'Advertisement not found' });
      }
      res.json(ad);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

const getAds = [
  ...validateAds,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const skip = parseInt(req.query.skip) || 0;
      const limit = parseInt(req.query.limit) || 10;
      const ads = await adModel.getAds(skip, limit);
      res.json(ads);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

const updateAd = [
  param('id').notEmpty().withMessage('Advertisement ID is required'),
  ...validateAd,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const ad = await adModel.updateAd(req.params.id, req.body);
      if (!ad) {
        return res.status(404).json({ error: 'Advertisement not found' });
      }
      res.json(ad);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

const deleteAd = [
  param('id').notEmpty().withMessage('Advertisement ID is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const success = await adModel.deleteAd(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Advertisement not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

const getAdsForUser = [
  ...validateUserAds,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const skip = parseInt(req.query.skip) || 0;
      const limit = parseInt(req.query.limit) || 10;
      const ads = await adModel.getAdsForUser(req.params.userId, skip, limit);
      res.json(ads);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

module.exports = {
  createAd,
  getAd,
  getAds,
  updateAd,
  deleteAd,
  getAdsForUser
};