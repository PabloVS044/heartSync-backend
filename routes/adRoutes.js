const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const adModel = require('../models/adModel');

router.post('/', adController.createAd);
router.get('/:id', adController.getAd);
router.patch('/:id/archive', adController.archiveAd);
router.get('/archived', async (req, res) => {
  try {
    const archivedAds = await adModel.getArchivedAds();
    res.json(archivedAds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;