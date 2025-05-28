const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/', userController.createUser);
router.post('/login', userController.login);
router.post('/google-login', userController.googleLogin);
router.put('/profile/:id', userController.updateUserProfile);
router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.get('/miPerfil/:id', userController.getUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.post('/:id/preferences', userController.setPreferences);
router.get('/:id/matches', userController.getMatches);
router.post('/:id/like/:targetId', userController.addLike);
router.post('/:id/dislike/:targetId', userController.dislikeUser);
router.post('/:id/unmatch/:targetId', userController.unmatchUser);

module.exports = router;