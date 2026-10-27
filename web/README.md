# Chatly — Web Client

A modern, responsive real-time chat web interface built with **Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and Socket.IO Client**.

---

## 🌟 Key Features

- **⚡ Real-Time Messaging:** Instant two-way communication powered by Socket.IO with automatic reconnection and fallback transports.
- **💬 Direct & Group Chats:** Create 1-on-1 private conversations with search or multi-user group channels with custom names.
- **🟢 Live Online Presence:** Real-time online/offline indicator dots reflecting member availability across the workspace.
- **✍️ Real-Time Typing Indicators:** Visual typing status alerts displayed live as participants compose messages.
- **🔔 Unread Message Counters:** Live badges tracking unread message volume per conversation, automatically clearing when a conversation is opened.
- **🔒 Multi-Provider Authentication:**
  - Standard email and password registration and login with local token management.
  - Google OAuth 2.0 integration supporting code authorization and server redirect callbacks.
- **🎨 Modern Tailwind CSS v4 UI:**
  - Clean Material Design 3 inspired color palettes with dark/light surfaces.
  - Material Symbols icons and Geist typography.
  - Responsive mobile drawer and collapsible sidebar for small screens.
  - Grouped date dividers, formatted message timestamps, and sender avatars.
- **📜 Smart Scrolling & Pagination:** Auto-scrolls on new incoming messages, preserves scroll positions, and supports message cursor pagination.

---

## 🏗️ Project Architecture & Directory Structure

```
web/
├── app/
│   ├── chat/
│   │   └── page.tsx         # Main chat dashboard (rooms, messages, sidebar, modals)
│   ├── login/
│   │   └── page.tsx         # Login page with credentials form and Google OAuth
│   ├── register/
│   │   └── page.tsx         # User registration page with avatar configuration
│   ├── not-found.tsx        # Custom 404 not found page
│   ├── layout.tsx           # Root HTML layout, font setup, and AuthProvider wrapper
│   ├── page.tsx             # Marketing landing page with hero, features, and demo modal
│   └── globals.css          # Tailwind CSS v4 styling rules and custom color variables
├── lib/
│   ├── api.ts               # Typed REST API client with JWT header injection
│   ├── auth-context.tsx     # React Context Provider managing auth state and sessions
│   ├── google-auth.ts       # Google OAuth flow initiator and URL builders
│   ├── socket.ts            # Socket.IO client manager singleton
│   └── types.ts             # Shared TypeScript models (User, Room, Message, RoomMember)
├── public/                  # Static assets and icons
├── next.config.ts           # Next.js build configuration
├── tailwind.config.ts       # Tailwind CSS theme extensions
└── tsconfig.json            # TypeScript compiler configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 20 & 24)
- npm 9+ or pnpm / yarn
- Backend server running (either locally at `http://localhost:5000` or deployed on Render)

### 2. Environment Variables
Create a `.env.local` file in the `/web` directory:

```env
# URL of the backend REST & WebSocket API
NEXT_PUBLIC_API_URL=http://localhost:5000

# Google OAuth 2.0 Web Client ID (optional, for Google Sign-In)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend Express + Socket.IO server | `http://localhost:5000` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID from Google Cloud Console for OAuth | Optional |

### 3. Installation
```bash
# Navigate to the web directory
cd web

# Install dependencies
npm install
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Building for Production
```bash
# Build production bundle with Next.js Turbopack
npm run build

# Start production server
npm run start
```

### 6. Linting
```bash
npm run lint
```

---

## 🧩 Core Modules & Integration

### 1. Authentication Provider (`lib/auth-context.tsx`)
Exposes the `useAuth()` hook which manages:
- Current user profile (`User | null`)
- Authentication token (`string | null`), persisted in `localStorage` under `chatly_token`
- `login(email, password)` and `register(name, email, password, avatarUrl)` methods
- `logout()`: Clears localStorage and disconnects active Socket.IO connections

### 2. REST API Client (`lib/api.ts`)
A lightweight, typed wrapper around native `fetch` that automatically:
- Injects the `Authorization: Bearer <token>` header if authenticated
- Formats JSON request bodies
- Normalizes API error responses into descriptive JavaScript `Error` objects
- Endpoints covered:
  - `api.login()`, `api.register()`, `api.googleAuth()`, `api.getMe()`
  - `api.searchUsers(query)`
  - `api.getRooms()`, `api.createDirectRoom()`, `api.createGroupRoom()`, `api.getRoom()`
  - `api.getMessages(roomId, cursor, limit)`, `api.sendMessage()`, `api.markRoomAsRead()`

### 3. Real-Time Socket Manager (`lib/socket.ts`)
- Manages an active `socket.io-client` singleton instance.
- Automatically connects with the JWT auth token:
  ```typescript
  io(SOCKET_URL, {
    auth: { token: authToken },
    autoConnect: true,
    reconnection: true,
  });
  ```
- Subscribes to backend events:
  - `ready`: Receives list of auto-joined room channels
  - `message:new`: Appends message to active chat or increments target room unread counter
  - `typing:update`: Toggles the typing indicator banner
  - `presence:update`: Syncs the list of online user IDs

---

## 🎨 UI & Styling System

The application uses **Tailwind CSS v4** with a custom color scheme configured in `app/globals.css`:
- `surface` / `surface-container-low` / `surface-container-high`: Background surfaces and elevation layers
- `primary` / `primary-container` / `on-primary`: Brand accent colors
- `on-surface` / `on-surface-variant`: High and medium contrast text hierarchies
- `outline-variant`: Subtle dividing lines and borders

---

## 🚀 Deployment

The Next.js client is configured for deployment on **Vercel**:
1. Connect the repository to your Vercel project.
2. Set the **Root Directory** to `web`.
3. Add the environment variables:
   - `NEXT_PUBLIC_API_URL`: Your deployed backend URL (e.g. `https://chatapp-bhua.onrender.com`)
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
4. Click **Deploy**. Vercel will automatically build and distribute the site globally.
