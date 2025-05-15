const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');

router.post('/', adController.createAd);
router.get('/', adController.getAds);
router.get('/:id', adController.getAd);
router.put('/:id', adController.updateAd);
router.delete('/:id', adController.deleteAd);
router.get('/user/:userId', adController.getAdsForUser);

module.exports = router;