# ChatApp Backend API & Real-Time Server

High-performance, secure, and production-ready real-time chat backend built with **Node.js, Express 5, TypeScript, Socket.IO, MongoDB (Mongoose 9), and Zod**.

---

## 🏗️ Architecture & Technology Stack

- **Runtime & Language:** Node.js (v18+) with TypeScript
- **HTTP Framework:** Express 5 (`express`)
- **Real-Time Communication:** Socket.IO 4 (`socket.io`)
- **Database & ODM:** MongoDB with Mongoose 9 (`mongoose`)
- **Authentication:** JWT (`jsonwebtoken`), bcrypt password hashing (`bcryptjs`), Google OAuth 2.0
- **Validation:** Zod 4 (`zod`) schemas with middleware request validation
- **Security:** Helmet (`helmet`), dynamic CORS origin validator, tiered rate limiting (`express-rate-limit`)
- **Logging:** Structured JSON logging with Pino (`pino`, `pino-http`) and `pino-pretty` development output
- **Testing:** Vitest (`vitest`) and Supertest (`supertest`)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 20 & 24)
- npm 9+
- A running MongoDB instance (MongoDB Atlas cluster or local MongoDB instance: `mongodb://localhost:27017/chatapp`)

### 2. Environment Configuration
Create a `.env` file in the `/server` directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ChatApp?retryWrites=true&w=majority
CLIENT_URL=http://localhost:3000
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Port number for the HTTP & WebSocket server | `5000` |
| `MONGODB_URI` | MongoDB connection URI string | `mongodb://localhost:27017/chatapp` |
| `CLIENT_URL` | Frontend origin for CORS and OAuth redirects | `http://localhost:3000` |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens | Required in production |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web Client ID | Optional (for Google Auth) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret | Optional (for Google Auth) |

### 3. Installation & Database Seeding
```bash
# Navigate to the server directory
cd server

# Install all dependencies
npm install

# Seed database with sample users and initial rooms
npm run seed
```

> **Pre-configured Seed Users:**
> - `alice@example.com` / `password123`
> - `bob@example.com` / `password123`
> - `charlie@example.com` / `password123`

### 4. Running the Server
```bash
# Development mode with hot-reloading (via tsx watch)
npm run dev

# Build TypeScript to production JavaScript (/dist)
npm run build

# Start production server from /dist
npm start
```

### 5. Running Automated Tests & Utilities
```bash
# Run Vitest integration test suite
npm test

# Run Vitest in watch mode
npm run test:watch

# Standalone utility test scripts
npm run test:auth      # Verifies registration and login flows
npm run test:rooms     # Verifies room creation and membership checks
npm run test:messages  # Verifies sending, editing, and pagination of messages
npm run test:sockets   # Verifies real-time Socket.IO connection and broadcast
```

---

## 📡 REST API Reference

All protected endpoints require an `Authorization` header:
```http
Authorization: Bearer <jwt_access_token>
```

All JSON error responses follow a consistent format:
```json
{
  "status": "fail" | "error",
  "message": "Descriptive error message",
  "errors": [] // Optional Zod validation error details
}
```

### Authentication (`/auth` or `/api/auth`)

| Method | Endpoint | Description | Auth | Request Body |
|---|---|---|:---:|---|
| `POST` | `/auth/register` | Register new user account | No | `{ name, email, password, avatarUrl? }` |
| `POST` | `/auth/login` | Login with email and password | No | `{ email, password }` |
| `POST` | `/auth/google` | Authenticate using Google OAuth code or ID token | No | `{ idToken?: string, code?: string, redirectUri?: string }` |
| `GET` | `/auth/google` | Initiate Google OAuth 2.0 authorization redirect | No | `?origin=http://localhost:3000` (optional) |
| `GET` | `/auth/google/callback`| OAuth callback handler, exchanges code and redirects to frontend | No | `?code=...` |
| `GET` | `/auth/me` | Retrieve profile of the currently authenticated user | **Yes** | — |

### Users (`/users` or `/api/users`)

| Method | Endpoint | Description | Auth | Query Parameters |
|---|---|---|:---:|---|
| `GET` | `/users?search=` | Search users by name or email (excludes authenticated user) | **Yes** | `search`: string |

### Rooms (`/rooms` or `/api/rooms`)

| Method | Endpoint | Description | Auth | Request Body |
|---|---|---|:---:|---|
| `GET` | `/rooms` | List all rooms for current user with unread counts & last message | **Yes** | — |
| `POST` | `/rooms` | Create a new group room (creator is automatically assigned `ADMIN`) | **Yes** | `{ name: string, memberIds: string[] }` |
| `POST` | `/rooms/direct` | Find or create an idempotent 1-on-1 DM room | **Yes** | `{ recipientId: string }` |
| `GET` | `/rooms/:id` | Get room details (returns 403 if user is not a member) | **Yes** | — |
| `POST` | `/rooms/:id/members` | Add a member to a group room (Admin only) | **Yes** | `{ userId: string }` |
| `DELETE` | `/rooms/:id/members/:userId` | Remove member or leave group room | **Yes** | — |

### Messages (`/rooms/:id/messages` & `/messages/:id`)

| Method | Endpoint | Description | Auth | Query / Request Body |
|---|---|---|:---:|---|
| `POST` | `/rooms/:id/messages` | Send a message to a room | **Yes** | `{ content: string }` |
| `GET` | `/rooms/:id/messages` | Get room message history (cursor paginated, newest first) | **Yes** | `cursor` (last `_id`), `limit` (default: 20) |
| `POST` | `/rooms/:id/read` | Mark room as read (updates `lastReadAt` and resets unread count) | **Yes** | — |
| `PATCH` | `/messages/:id` | Edit message content (author only) | **Yes** | `{ content: string }` |
| `DELETE` | `/messages/:id` | Delete a message (author only) | **Yes** | — |

### System & Health

| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `GET` | `/health` | Health check returning status and server uptime | No |

---

## ⚡ Socket.IO Real-Time Architecture

### Handshake Authentication
Client connections authenticate during the Socket.IO handshake via the `auth.token` parameter:
```typescript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: { token: "<jwt_access_token>" },
  transports: ["websocket", "polling"],
  reconnection: true,
});
```

### Auto-Join on Connect
Upon successful authentication, the server:
1. Registers the socket with the in-memory **Presence Manager**.
2. Automatically queries MongoDB for all rooms the user belongs to and joins the corresponding Socket.IO rooms (`socket.join(roomId)`).
3. Emits `ready` to the client with the list of joined room IDs.
4. Broadcasts `presence:update` to all users if the user transitioned from offline to online.

### Client-to-Server Events (Emit)

| Event | Payload | Acknowledgement Callback | Description |
|---|---|---|---|
| `message:send` | `{ roomId: string, content: string }` | `(res: { status: "success" \| "fail", data?: { message }, error?: string }) => void` | Validates membership, persists message, updates room preview, and broadcasts to room |
| `typing:start` | `{ roomId: string }` | — | Broadcasts to room members that the user is typing |
| `typing:stop` | `{ roomId: string }` | — | Broadcasts to room members that typing stopped |
| `room:join` | `{ roomId: string }` | `(res: { status: "success" \| "fail", message?: string }) => void` | Explicitly joins a room channel after authorization |
| `room:leave` | `{ roomId: string }` | `(res: { status: "success" \| "fail", message?: string }) => void` | Leaves a room channel |

### Server-to-Client Events (Listen)

| Event | Payload | Description |
|---|---|---|
| `ready` | `{ rooms: string[] }` | Sent on connection confirming auto-joined rooms |
| `message:new` | `FormattedMessage` | Broadcast to all room members when a new message is posted |
| `typing:update` | `{ roomId, userId, userName, isTyping: boolean }` | Broadcast when a room member starts/stops typing |
| `presence:update` | `{ userId, status: "ONLINE" \| "OFFLINE", onlineUsers?: string[] }` | Sent on connect with all online user IDs, and broadcast on state change |

---

## 🗄️ Database Schemas & Indexing

The backend uses **MongoDB** via Mongoose models structured for sub-millisecond query performance:

### `User` Collection
- Fields: `_id`, `name`, `email` (unique, indexed), `passwordHash`, `avatarUrl`, `createdAt`, `updatedAt`

### `Room` Collection
- Fields: `_id`, `type` (`"DIRECT"` or `"GROUP"`), `name`, `members` (`[{ userId, role, lastReadAt }]`), `directKey` (sorted user IDs string, e.g. `user1:user2`), `lastMessage` (denormalized preview object), `createdAt`, `updatedAt`
- **Indexes:**
  - `members.userId`: Fast room lookup by user
  - `directKey`: Unique sparse index preventing duplicate direct message rooms between two users

### `Message` Collection
- Fields: `_id`, `roomId` (ref `Room`), `senderId` (ref `User`), `content`, `isEdited`, `createdAt`, `updatedAt`
- **Compound Index:**
  - `{ roomId: 1, _id: -1 }`: Optimizes cursor-based pagination for descending chronological chat queries

---

## 🛡️ Security & Hardening Features

- **Helmet**: Sets HTTP security headers (Content Security Policy, Cross-Origin Opener/Resource Policies, HSTS, frameguard).
- **Dynamic CORS**: Validates request origins dynamically against `CLIENT_URL`, localhost development ports, and production Vercel domains (`https://*.vercel.app`).
- **Tiered Rate Limiting**:
  - `authLimiter`: 50 requests per 15-minute window for `/auth/*` endpoints.
  - `apiLimiter`: 500 requests per 15-minute window for standard REST endpoints.
  - `messageLimiter`: 60 messages per minute on message creation endpoints.
  - `Socket Rate Limiter`: 25 messages per sliding 10-second window per socket.
- **Strict Authorization**: Every room operation and message retrieval verifies that the requesting user's ID is an active member of that room.
- **Pino HTTP Logging**: Structured JSON logging in production and colorized format in development, with health-check logs filtered out to reduce noise.
