// index.js
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
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(morgan('dev'));
    this.app.use(express.static('public'));
    this.app.use((req, res, next) => {
      res.set('Cache-Control', 'no-store');
      next();
    });
  }

  routes() {
    this.app.use('/users', userRoutes);
    this.app.use('/ads', adRoutes);
    this.app.use('/chats', chatRoutes);
    this.app.use('/matches', matchRoutes);
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