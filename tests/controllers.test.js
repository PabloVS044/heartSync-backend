const {
  createUser,
  login,
  googleLogin,
  getUser,
  updateUserProfile,
} = require('../controllers/userController');
const {
  createAd,
  getAd,
  getAdsForUser,
} = require('../controllers/adController');
const {
  getMatch,
  getMatchesForUser,
} = require('../controllers/matchController');
const {
  getChat,
  getChatsForUser,
  markMessagesAsRead,
} = require('../controllers/chatController');

const userModel = require('../models/userModel');
const adModel = require('../models/adModel');
const matchModel = require('../models/matchModel');
const chatModel = require('../models/chatModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

jest.mock('../models/userModel');
jest.mock('../models/adModel');
jest.mock('../models/matchModel');
jest.mock('../models/chatModel');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('google-auth-library');

describe('Controllers', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
  });

  // Pruebas para userController
  describe('userController', () => {
    describe('createUser', () => {
      it('should create a user and return 201', async () => {
        req.body = {
          name: 'Juan',
          surname: 'Pérez',
          email: 'juan@example.com',
          password: 'password123',
          age: 25,
          country: 'Argentina',
          gender: 'male',
          interests: ['music', 'sports'],
          photos: ['photo1.jpg'],
          bio: 'Hola!',
        };
        const mockUser = { id: '123', ...req.body, password: undefined };
        userModel.createUser.mockResolvedValue(mockUser);

        await createUser[1](req, res);

        expect(userModel.createUser).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(mockUser);
      });

      it('should return 400 if validation fails', async () => {
        req.body = { name: '', email: 'invalid' };

        await createUser[1](req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Array) }));
      });
    });

    describe('login', () => {
      it('should login user and return token', async () => {
        req.body = { email: 'juan@example.com', password: 'password123' };
        const mockUser = { id: '123', email: 'juan@example.com' };
        userModel.loginUser.mockResolvedValue(mockUser);
        jwt.sign.mockReturnValue('mockToken');

        await login[1](req, res);

        expect(userModel.loginUser).toHaveBeenCalledWith('juan@example.com', 'password123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ token: 'mockToken', userId: '123' });
      });

      it('should return 401 on invalid credentials', async () => {
        req.body = { email: 'juan@example.com', password: 'wrong' };
        userModel.loginUser.mockRejectedValue(new Error('Incorrect password'));

        await login[1](req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Incorrect password' });
      });
    });

    describe('googleLogin', () => {
      it('should login with Google and return token', async () => {
        req.body = { token: 'googleToken' };
        const mockPayload = {
          sub: 'google123',
          email: 'juan@example.com',
          name: 'Juan Pérez',
          picture: 'photo.jpg',
        };
        const mockUser = { id: '123', email: 'juan@example.com' };
        OAuth2Client.prototype.verifyIdToken.mockResolvedValue({ getPayload: () => mockPayload });
        userModel.createOrUpdateGoogleUser.mockResolvedValue(mockUser);
        jwt.sign.mockReturnValue('mockToken');

        await googleLogin[1](req, res);

        expect(userModel.createOrUpdateGoogleUser).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ token: 'mockToken', userId: '123' });
      });
    });

    describe('getUser', () => {
      it('should get a user by ID', async () => {
        req.params.id = 'user123';
        const mockUser = { id: 'user123', name: 'Juan' };
        userModel.getUser.mockResolvedValue(mockUser);

        await getUser[0](req, res);

        expect(userModel.getUser).toHaveBeenCalledWith('user123');
        expect(res.json).toHaveBeenCalledWith(mockUser);
      });

      it('should return 404 if user not found', async () => {
        req.params.id = 'user123';
        userModel.getUser.mockResolvedValue(null);

        await getUser[0](req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
      });
    });

    describe('updateUserProfile', () => {
      it('should update user profile', async () => {
        req.params.id = 'user123';
        req.body = { bio: 'New bio', interests: ['music'] };
        const mockUser = { id: 'user123', bio: 'New bio' };
        userModel.updateUserProfile.mockResolvedValue(mockUser);

        await updateUserProfile[2](req, res);

        expect(userModel.updateUserProfile).toHaveBeenCalledWith('user123', req.body);
        expect(res.json).toHaveBeenCalledWith(mockUser);
      });
    });
  });

  // Pruebas para adController
  describe('adController', () => {
    describe('createAd', () => {
      it('should create an ad and return 201', async () => {
        req.body = {
          title: 'New Ad',
          description: 'Ad description',
          image: 'http://example.com/image.jpg',
          targetedInterests: ['music', 'sports'],
        };
        const mockAd = { id: 'ad123', ...req.body };
        adModel.createAd.mockResolvedValue(mockAd);

        await createAd[1](req, res);

        expect(adModel.createAd).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(mockAd);
      });

      it('should return 400 if validation fails', async () => {
        req.body = { title: '', description: '' };

        await createAd[1](req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Array) }));
      });
    });

    describe('getAd', () => {
      it('should get an ad by ID', async () => {
        req.params.id = 'ad123';
        const mockAd = { id: 'ad123', title: 'Ad' };
        adModel.getAd.mockResolvedValue(mockAd);

        await getAd[1](req, res);

        expect(adModel.getAd).toHaveBeenCalledWith('ad123');
        expect(res.json).toHaveBeenCalledWith(mockAd);
      });

      it('should return 404 if ad not found', async () => {
        req.params.id = 'ad123';
        adModel.getAd.mockResolvedValue(null);

        await getAd[1](req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Advertisement not found' });
      });
    });

    describe('getAdsForUser', () => {
      it('should get ads for a user', async () => {
        req.params.userId = 'user123';
        req.query = { skip: '0', limit: '10' };
        const mockAds = [{ id: 'ad1', title: 'Ad1' }];
        adModel.getAdsForUser.mockResolvedValue(mockAds);

        await getAdsForUser[1](req, res);

        expect(adModel.getAdsForUser).toHaveBeenCalledWith('user123', 0, 10);
        expect(res.json).toHaveBeenCalledWith(mockAds);
      });
    });
  });

  // Pruebas para matchController
  describe('matchController', () => {
    describe('getMatch', () => {
      it('should get a match by ID', async () => {
        req.params.matchId = 'match123';
        const mockMatch = { match: { id: 'match123' }, users: [], chat: null };
        matchModel.getMatch.mockResolvedValue(mockMatch);

        await getMatch[1](req, res);

        expect(matchModel.getMatch).toHaveBeenCalledWith('match123');
        expect(res.json).toHaveBeenCalledWith(mockMatch);
      });

      it('should return 404 if match not found', async () => {
        req.params.matchId = 'match123';
        matchModel.getMatch.mockResolvedValue(null);

        await getMatch[1](req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Match not found' });
      });
    });

    describe('getMatchesForUser', () => {
      it('should get matches for a user', async () => {
        req.params.userId = 'user123';
        req.query = { skip: '0', limit: '10' };
        const mockMatches = [{ match: { id: 'match1' }, otherUser: {}, chat: null }];
        matchModel.getMatchesForUser.mockResolvedValue(mockMatches);

        await getMatchesForUser[1](req, res);

        expect(matchModel.getMatchesForUser).toHaveBeenCalledWith('user123', 0, 10);
        expect(res.json).toHaveBeenCalledWith(mockMatches);
      });
    });
  });

  // Pruebas para chatController
  describe('chatController', () => {
    describe('getChat', () => {
      it('should get a chat by ID', async () => {
        req.params.chatId = 'chat123';
        const mockChat = { id: 'chat123', messages: [] };
        chatModel.getChat.mockResolvedValue(mockChat);

        await getChat[1](req, res);

        expect(chatModel.getChat).toHaveBeenCalledWith('chat123');
        expect(res.json).toHaveBeenCalledWith(mockChat);
      });

      it('should return 404 if chat not found', async () => {
        req.params.chatId = 'chat123';
        chatModel.getChat.mockRejectedValue(new Error('Chat not found'));

        await getChat[1](req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Chat not found' });
      });
    });

    describe('getChatsForUser', () => {
      it('should get chats for a user', async () => {
        req.params.userId = 'user123';
        const mockChats = [{ chat: { id: 'chat1' }, otherUser: {} }];
        chatModel.getChatsForUser.mockResolvedValue(mockChats);

        await getChatsForUser[1](req, res);

        expect(chatModel.getChatsForUser).toHaveBeenCalledWith('user123');
        expect(res.json).toHaveBeenCalledWith(mockChats);
      });
    });

    describe('markMessagesAsRead', () => {
      it('should mark messages as read', async () => {
        req.params.chatId = 'chat123';
        req.body = { userId: 'user123' };
        const mockChat = { id: 'chat123', messages: [{ id: 'msg1', isRead: true }] };
        chatModel.markMessagesAsRead.mockResolvedValue(mockChat);

        await markMessagesAsRead[1](req, res);

        expect(chatModel.markMessagesAsRead).toHaveBeenCalledWith('chat123', 'user123');
        expect(res.json).toHaveBeenCalledWith(mockChat);
      });

      it('should return 404 if chat not found', async () => {
        req.params.chatId = 'chat123';
        req.body = { userId: 'user123' };
        chatModel.markMessagesAsRead.mockResolvedValue(null);

        await markMessagesAsRead[1](req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Chat not found' });
      });
    });
  });
});