const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const adModel = require('../models/adModel');

router.post('/', adController.createAd);
router.get('/', adController.getAds);
router.get('/:id', adController.getAd);
router.put('/:id', adController.updateAd);
router.delete('/:id', adController.deleteAd);
router.get('/user/:userId', adController.getAdsForUser);
router.get('/stats', async (req, res) => {
  try {
    const stats = await adModel.getAdStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;