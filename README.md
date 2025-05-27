# Meeting Time Gambling App

This app allows users to join a session, guess how long a meeting will last, and see real-time updates from other participants. It uses:
- **Frontend:** React (with React Aria for accessibility)
- **Backend:** Node.js (Express + socket.io for WebSockets)

## Getting Started

### 1. Start the Backend
```
node server.js
```

### 2. Start the Frontend
```
npm run dev
```

The frontend will run on [http://localhost:5173](http://localhost:5173) and the backend WebSocket server on [http://localhost:4000](http://localhost:4000).

## Features
- Join a session (room)
- Submit your guess for meeting duration
- See all users' guesses in real time
- Accessible UI with React Aria

---

For development, both frontend and backend can be run from this workspace.
