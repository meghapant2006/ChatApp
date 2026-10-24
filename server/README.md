# ChatApp Backend API & Real-Time Server

High-performance real-time chat backend built with **Node.js, Express, TypeScript, Socket.IO, MongoDB (Mongoose), and Zod**.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 24)
- MongoDB instance (MongoDB Atlas cluster or local Docker container)

### 2. Environment Configuration
Create a `.env` file in `/server`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ChatApp?retryWrites=true&w=majority
CLIENT_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
```

### 3. Installation & Seeding
```bash
# Install dependencies
npm install

# Seed database with test users & initial rooms
npm run seed
```
> **Seed Users Created:**
> - `alice@example.com` / `password123`
> - `bob@example.com` / `password123`
> - `charlie@example.com` / `password123`

### 4. Running the Server
```bash
# Development (with hot-reload using tsx)
npm run dev

# Build TypeScript to dist
npm run build

# Start production build
npm start
```

### 5. Running Automated Tests
```bash
# Run complete Vitest integration test suite
npm test

# Run real-time Socket.IO test suite
npm run test:sockets
```

---

## 📡 REST API Reference

All protected endpoints require the HTTP header:
`Authorization: Bearer <jwt_access_token>`

### Authentication (`/auth` or `/api/auth`)
| Method | Endpoint | Description | Auth | Request Body |
|---|---|---|:---:|---|
| `POST` | `/auth/register` | Register a new user | No | `{ name, email, password, avatarUrl? }` |
| `POST` | `/auth/login` | Log in and receive JWT token | No | `{ email, password }` |
| `GET` | `/auth/me` | Fetch authenticated user profile | **Yes** | — |

### Users (`/users` or `/api/users`)
| Method | Endpoint | Description | Auth | Query / Body |
|---|---|---|:---:|---|
| `GET` | `/users?search=` | Search users by name or email (excludes self) | **Yes** | `search` (query param) |

### Rooms (`/rooms` or `/api/rooms`)
| Method | Endpoint | Description | Auth | Request Body |
|---|---|---|:---:|---|
| `GET` | `/rooms` | List all rooms for current user with unread counts & last message | **Yes** | — |
| `POST` | `/rooms` | Create a new group room (creator is `ADMIN`) | **Yes** | `{ name: string, memberIds: string[] }` |
| `POST` | `/rooms/direct` | Find or create a 1-on-1 DM room (idempotent) | **Yes** | `{ recipientId: string }` |
| `GET` | `/rooms/:id` | Get room details (403 if non-member) | **Yes** | — |
| `POST` | `/rooms/:id/members` | Add a member to group room (Admin only) | **Yes** | `{ userId: string }` |
| `DELETE` | `/rooms/:id/members/:userId` | Remove member or leave group room | **Yes** | — |

### Messages (`/rooms/:id/messages` & `/messages/:id`)
| Method | Endpoint | Description | Auth | Query / Body |
|---|---|---|:---:|---|
| `POST` | `/rooms/:id/messages` | Send a message to a room | **Yes** | `{ content: string }` |
| `GET` | `/rooms/:id/messages` | Get room message history (cursor paginated, newest first) | **Yes** | `cursor` (last message _id), `limit` (default: 20) |
| `POST` | `/rooms/:id/read` | Mark room as read (resets unread counter) | **Yes** | — |
| `PATCH` | `/messages/:id` | Edit message content (sender only) | **Yes** | `{ content: string }` |
| `DELETE` | `/messages/:id` | Delete message (sender only) | **Yes** | — |

### Utility
| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `GET` | `/health` | Health check endpoint returning status and uptime | No |

---

## ⚡ Socket.IO Real-Time Events

### Connection & Handshake Authentication
Connect using Socket.IO client passing the JWT token in `auth.token`:
```typescript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: { token: "<your_jwt_token>" },
  transports: ["websocket"],
});
```

### Server-to-Client Events (Listen)
| Event | Payload | Description |
|---|---|---|
| `ready` | `{ rooms: string[] }` | Emitted to connecting socket when channels are auto-joined |
| `presence:update` | `{ userId, status: "ONLINE" \| "OFFLINE", onlineUsers?: string[] }` | Broadcast when a user's presence changes or on initial connect |
| `typing:update` | `{ roomId, userId, userName, isTyping: boolean }` | Broadcast when a member starts or stops typing |
| `message:new` | `FormattedMessage` | Broadcast to all room members when a new message is posted |

### Client-to-Server Events (Emit)
| Event | Payload | Callback Acknowledgement | Description |
|---|---|---|---|
| `message:send` | `{ roomId: string, content: string }` | `(res: { status: "success" \| "fail", data?: { message }, error?: string }) => void` | Sends and persists a message |
| `typing:start` | `{ roomId: string }` | — | Notifies room members that user is typing |
| `typing:stop` | `{ roomId: string }` | — | Notifies room members that user stopped typing |
| `room:join` | `{ roomId: string }` | `(res: { status: "success" \| "fail", message?: string }) => void` | Join room socket channel (membership checked) |
| `room:leave` | `{ roomId: string }` | `(res: { status: "success" \| "fail", message?: string }) => void` | Leave room socket channel |

---

## 🛡️ Security & Hardening Features
- **Helmet**: Secures HTTP response headers with strict CSP, COOP, CORP, and HSTS.
- **CORS**: Origin validation, credentials enabled, and strict allowed methods & headers.
- **Rate Limiting**:
  - `authLimiter`: Max 50 requests per 15 minutes on auth routes.
  - `apiLimiter`: Max 500 requests per 15 minutes on REST endpoints.
  - `messageLimiter`: Max 60 messages per minute on message endpoints.
  - Socket Rate Limiter: Max 25 messages per 10-second sliding window per socket.
- **Validation**: Strict schema parsing using Zod on every endpoint and socket payload.
- **Authorization**: Comprehensive membership checks on every room and message action; unauthorized access triggers `403 Forbidden`.
- **Structured Logging**: Low-overhead JSON logging with Pino, pretty-printing in development, and error stack tracking.
