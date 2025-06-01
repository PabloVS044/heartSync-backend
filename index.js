const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');
const userRoutes = require('./routes/userRoutes');
const adRoutes = require('./routes/adRoutes');
const chatRoutes = require('./routes/chatRoutes');
const matchRoutes = require('./routes/matchRoutes');
const chatModel = require('./models/chatModel');
require('dotenv').config();

class HeartSyncServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    this.port = process.env.PORT || 3000;

    this.app.set('io', this.io);
    console.log('Socket.IO instance set in app');

    this.middlewares();
    this.routes();
    this.socketEvents();
  }

  middlewares() {
    const allowedOrigins = [
      'http://localhost:5173',
      'https://heart-sync.vercel.app' // Reemplazá con tu frontend en producción si cambia
    ];

    const corsOptions = {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`Blocked by CORS: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };

    this.app.use(cors(corsOptions));
    this.app.options('*', cors(corsOptions));

    this.app.use(express.json());
    this.app.use(morgan('dev'));
    this.app.use(express.static('public'));
  }

  routes() {
    console.log('Registering routes...');
    this.app.use('/users', userRoutes);
    console.log('Registered /users routes');
    this.app.use('/ads', adRoutes);
    console.log('Registered /ads routes');
    this.app.use('/chats', chatRoutes);
    console.log('Registered /chats routes');
    this.app.use('/matches', matchRoutes);
    console.log('Registered /matches routes');
  }

  socketEvents() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      socket.on('joinChat', async (chatId) => {
        try {
          const chat = await chatModel.getChat(chatId);
          if (!chat) {
            socket.emit('error', { message: 'Chat not found' });
            return;
          }
          socket.join(chatId);
          console.log(`User ${socket.id} joined chat ${chatId}`);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('sendMessage', async ({ chatId, senderId, content, image }) => {
        try {
          const chat = await chatModel.getChat(chatId);
          if (!chat) {
            socket.emit('error', { message: 'Chat not found' });
            return;
          }
          const updatedChat = await chatModel.addMessage(chatId, senderId, content, image || null);
          const message = updatedChat.messages[updatedChat.messages.length - 1];
          this.io.to(chatId).emit('message', message);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('addReaction', async ({ chatId, messageId, userId, emoji }) => {
        try {
          const chat = await chatModel.getChat(chatId);
          if (!chat) {
            socket.emit('error', { message: 'Chat not found' });
            return;
          }
          const updatedChat = await chatModel.addReactionToMessage(chatId, messageId, userId, emoji);
          this.io.to(chatId).emit('messageReaction', { chatId, messageId, reaction: { userId, emoji } });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }

  listen() {
    this.server.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}

const server = new HeartSyncServer();
server.listen();

module.exports = { io: server.io };
