<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This project is a meeting time gambling app. It uses:
- React (frontend, with React Aria for accessibility)
- Node.js backend (Express + socket.io for WebSockets)

Frontend and backend are in the same workspace. The backend entry point is `server.js`. The frontend connects to the backend using socket.io-client.

When generating code, prefer accessible React components and real-time communication patterns.
