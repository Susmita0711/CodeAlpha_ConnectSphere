# ConnectSphere

**Connect. Collaborate. Communicate.**

ConnectSphere is a full-stack real-time meeting app with React, Vite, Express, MongoDB, Socket.IO and browser-native WebRTC. It includes account registration/login, multi-participant audio/video calls, screen sharing, room-scoped file sharing and a live collaborative whiteboard.

## Requirements

- Node.js 20.19+ (or 22.12+) and npm
- MongoDB Community running locally, or a MongoDB Atlas connection string
- A modern browser with camera/microphone access for calling

## Run on Windows

1. In VS Code, open the ConnectSphere project folder.
2. Copy the environment template. `MONGODB_URI` defaults to the local MongoDB service URL:

   ```powershell
   Copy-Item .env.example .env
   ```

   The server loads this workspace-root `.env` file. Set `JWT_SECRET` to a random secret of at least 32 characters. For Atlas, set `MONGODB_URI` to your own connection string; do not commit it. The local MongoDB Community Server must be installed and running on port 27017.

3. Install dependencies and start both development servers:

   ```powershell
   npm run install:all
   npm run dev
   ```

4. Open **http://localhost:5173**, register an account and create a meeting. Open another browser profile/device, register a second account, and join with the meeting ID to test multi-user calling, screen sharing, files and the whiteboard.

The client runs at `http://localhost:5173`; the API and Socket.IO server run at `http://localhost:5000`. If you change ports/hosts, set `CLIENT_ORIGIN`, `VITE_API_URL` and `VITE_SOCKET_URL` appropriately.

### MongoDB

Authentication requires MongoDB. Without a reachable MongoDB instance, the API process still starts and `/api/health` is available, but registration, login and account lookup cannot complete. For local MongoDB, install/start the MongoDB Community service. Or create your own Atlas database and put its URI in `.env`:

```env
MONGODB_URI=mongodb+srv://<your-user>:<your-password>@<your-cluster>/connectsphere
```

Replace the placeholders with your own credentials and allow your development machine in the Atlas network access list.

### TURN for restrictive networks

The app uses Google's public STUN server by default. STUN is sufficient for many networks, but direct peer connections can fail behind strict firewalls, carrier-grade NAT or symmetric NAT. For reliable connectivity on those networks, run or purchase a TURN service (for example, coturn), configure TLS/UDP as appropriate, then set the credentials in `.env`:

```env
TURN_URL=turns:turn.example.com:5349
TURN_USERNAME=<your-turn-username>
TURN_CREDENTIAL=<your-turn-credential>
```

The server returns the configured TURN server to authenticated clients through `/api/rtc-config`. No TURN credentials are bundled.

## Features and security notes

- Passwords are hashed with bcrypt; API routes and Socket.IO connections require signed JWTs.
- WebRTC uses browser RTCPeerConnection with SDP and ICE candidates relayed only between members of the same active room. WebRTC media is protected by the browser's DTLS-SRTP transport encryption.
- Screen sharing uses `getDisplayMedia()` and ends when the browser's share track ends.
- Uploads are limited to 20 MB by default, checked by MIME type and extension, stored outside the static web root, and downloadable only by an authenticated current room participant.
- Whiteboard strokes and clear events are relayed to the active room.
- Meeting/file membership is in-memory and active for the lifetime of the server process. File metadata is not persisted across server restarts; re-upload files after a restart.
- Use HTTPS in production; browsers only permit camera, microphone and screen capture on secure origins (localhost is allowed for development). Configure secure cookies if replacing bearer-token storage, production CORS, a durable room/file store, and a production-grade rate-limit store before public deployment.

## Build and tests

```powershell
npm test
npm run build
```

## Project layout

```text
client/       React application, Vite, Tailwind and UI
server/       Express API, Mongoose user model, Socket.IO and upload handling
.env.example  Environment variable template
```
