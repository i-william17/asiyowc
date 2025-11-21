const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

const initialize = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"]
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('Authentication error'));
      }

      socket.userId = user._id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);

    // Join user to their personal room
    socket.join(socket.userId.toString());

    // Handle chat events
    require('./chat')(socket, io);
    
    // Handle notification events
    require('./notifications')(socket, io);

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initialize, getIO };