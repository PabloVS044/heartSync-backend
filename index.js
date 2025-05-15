// server.js o app.js
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const adRoutes = require('./routes/adRoutes');
require('dotenv').config();

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;

    this.middlewares();
    this.routes();
  }

  middlewares() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
  }

  routes() {
    this.app.use('/users', userRoutes);
    this.app.use('/ads', adRoutes);
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}

const server = new Server();
server.listen();
