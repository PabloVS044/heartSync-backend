const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');

router.get('/:matchId', matchController.getMatch);
router.get('/user/:userId', matchController.getMatchesForUser);

module.exports = router;