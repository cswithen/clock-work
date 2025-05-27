// Simple Node.js WebSocket server using socket.io
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const sessions = {};

// Track meeting state per session
// sessions[sessionId].meeting = { started: bool, ended: bool, startTime: timestamp, elapsed: int, winner: obj }

io.on('connection', (socket) => {
  socket.on('meetingEnded', ({ sessionId, elapsed, winner }) => {
    if (sessions[sessionId]) {
      sessions[sessionId].meeting = sessions[sessionId].meeting || {};
      sessions[sessionId].meeting.ended = true;
      sessions[sessionId].meeting.started = false;
      sessions[sessionId].meeting.elapsed = elapsed;
      sessions[sessionId].meeting.winner = winner;
    }
    io.to(sessionId).emit('meetingEnded', { elapsed, winner });
  });
  socket.on('startMeeting', ({ sessionId }) => {
    if (sessions[sessionId]) {
      sessions[sessionId].meeting = sessions[sessionId].meeting || {};
      sessions[sessionId].meeting.started = true;
      sessions[sessionId].meeting.ended = false;
      sessions[sessionId].meeting.startTime = Date.now();
      sessions[sessionId].meeting.elapsed = 0;
      sessions[sessionId].meeting.winner = null;
    }
    io.to(sessionId).emit('meetingStarted');
  });
  socket.on('joinSession', ({ sessionId, userName, sessionName }) => {
    socket.join(sessionId);
    if (!sessions[sessionId]) sessions[sessionId] = { users: {}, guesses: {}, sessionName: sessionName || '' };
    if (sessionName) sessions[sessionId].sessionName = sessionName;
    sessions[sessionId].users[socket.id] = userName;
    // Send session state and meeting state to the new user
    socket.emit('sessionUpdate', sessions[sessionId]);
    if (sessions[sessionId].meeting && sessions[sessionId].meeting.started && !sessions[sessionId].meeting.ended) {
      // Calculate elapsed time since meeting started
      const elapsed = Math.floor((Date.now() - sessions[sessionId].meeting.startTime) / 1000);
      socket.emit('meetingStarted', { elapsed });
    } else if (sessions[sessionId].meeting && sessions[sessionId].meeting.ended) {
      socket.emit('meetingEnded', { elapsed: sessions[sessionId].meeting.elapsed, winner: sessions[sessionId].meeting.winner });
    }
    // Also broadcast to all users (including new) the session state
    io.to(sessionId).emit('sessionUpdate', sessions[sessionId]);
  });

  socket.on('submitGuess', ({ sessionId, guess, bet }) => {
    if (sessions[sessionId]) {
      // Normalize guess and bet to always be strings, fallback to empty string if missing
      const safeGuess = (guess !== undefined && guess !== null) ? String(guess) : '';
      const safeBet = (bet !== undefined && bet !== null) ? String(bet) : '';
      sessions[sessionId].guesses[socket.id] = { guess: safeGuess, bet: safeBet };
      io.to(sessionId).emit('sessionUpdate', sessions[sessionId]);
    }
  });

  socket.on('disconnect', () => {
    for (const sessionId in sessions) {
      delete sessions[sessionId].users[socket.id];
      delete sessions[sessionId].guesses[socket.id];
      io.to(sessionId).emit('sessionUpdate', sessions[sessionId]);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
