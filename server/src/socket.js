import { Server } from 'socket.io';
import { config } from './config.js';
import { socketUser } from './middleware/auth.js';
import { isValidRoomId } from './utils/validation.js';

export function attachSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientOrigin, methods: ['GET', 'POST'] },
    maxHttpBufferSize: 1e6
  });

  io.use((socket, next) => {
    try {
      socket.data.user = socketUser(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('Authentication required.'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('room:join', (roomId, acknowledge = () => {}) => {
      if (!isValidRoomId(roomId)) return acknowledge({ error: 'Invalid meeting ID.' });
      if (socket.data.roomId && socket.data.roomId !== roomId) {
        return acknowledge({ error: 'Leave your current meeting before joining another.' });
      }
      const peers = [...(io.sockets.adapter.rooms.get(roomId) || [])]
        .filter((id) => id !== socket.id)
        .map((id) => {
          const peer = io.sockets.sockets.get(id);
          return { socketId: id, user: { id: peer.data.user.sub, name: peer.data.user.name } };
        });
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.to(roomId).emit('participant:joined', {
        socketId: socket.id,
        user: { id: socket.data.user.sub, name: socket.data.user.name }
      });
      acknowledge({ roomId, socketId: socket.id, peers, user: { id: socket.data.user.sub, name: socket.data.user.name } });
      io.to(roomId).emit('participants:count', io.sockets.adapter.rooms.get(roomId)?.size || 0);
    });

    socket.on('webrtc:signal', ({ to, description, candidate } = {}) => {
      const roomId = socket.data.roomId;
      const target = io.sockets.sockets.get(to);
      if (!roomId || !target || target.data.roomId !== roomId) return;
      if (description) io.to(to).emit('webrtc:signal', { from: socket.id, description });
      if (candidate) io.to(to).emit('webrtc:signal', { from: socket.id, candidate });
    });

    socket.on('whiteboard:draw', (payload) => {
      if (socket.data.roomId) socket.to(socket.data.roomId).emit('whiteboard:draw', payload);
    });
    socket.on('whiteboard:clear', () => {
      if (socket.data.roomId) socket.to(socket.data.roomId).emit('whiteboard:clear');
    });
    socket.on('participant:media', (state) => {
      if (socket.data.roomId) socket.to(socket.data.roomId).emit('participant:media', {
        socketId: socket.id, audio: Boolean(state?.audio), video: Boolean(state?.video), screen: Boolean(state?.screen)
      });
    });
    socket.on('disconnecting', () => {
      const roomId = socket.data.roomId;
      if (roomId) {
        socket.to(roomId).emit('participant:left', { socketId: socket.id });
        setTimeout(() => {
          const count = io.sockets.adapter.rooms.get(roomId)?.size || 0;
          io.to(roomId).emit('participants:count', count);
        }, 0);
      }
    });
    socket.on('room:leave', () => socket.disconnect(true));
  });

  return io;
}
