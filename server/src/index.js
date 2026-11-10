import http from 'node:http';
import mongoose from 'mongoose';
import { config } from './config.js';
import { createApp } from './app.js';
import { attachSocketServer } from './socket.js';

const memberships = new Map();
const isRoomMember = (roomId, userId) => (memberships.get(roomId)?.get(userId) || 0) > 0;
let io;
const httpServer = http.createServer(createApp(isRoomMember, (roomId, file) => io?.to(roomId).emit('file:shared', file)));
io = attachSocketServer(httpServer);

io.on('connection', (socket) => {
  socket.on('room:join', (roomId, acknowledge) => {
    if (typeof acknowledge !== 'function') return;
    if (socket.data.membershipTrackedRoom === roomId) return;
    const old = socket.data.roomId;
    if (old && old !== roomId) return;
    socket.data.membershipTrackedRoom = roomId;
    const users = memberships.get(roomId) || new Map();
    const userId = socket.data.user.sub;
    users.set(userId, (users.get(userId) || 0) + 1);
    memberships.set(roomId, users);
    socket.once('disconnect', () => {
      const remaining = (users.get(userId) || 1) - 1;
      if (remaining > 0) users.set(userId, remaining);
      else users.delete(userId);
      if (!users.size) memberships.delete(roomId);
    });
  });
});

if (config.mongoUri) {
  mongoose.connect(config.mongoUri)
    .then(() => console.log('MongoDB connected.'))
    .catch((error) => console.error(`MongoDB connection failed: ${error.message}`));
} else {
  console.error('MONGODB_URI is not configured. Authentication endpoints will be unavailable.');
}

httpServer.listen(config.port, () => {
  console.log(`ConnectSphere API listening on http://localhost:${config.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await mongoose.disconnect();
    httpServer.close(() => process.exit(0));
  });
}
