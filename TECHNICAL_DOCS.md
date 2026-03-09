# CoreChat by Corework — Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Environment Setup](#environment-setup)
6. [Running the Application](#running-the-application)
7. [API Reference](#api-reference)
8. [WebSocket Events](#websocket-events)
9. [Database Schemas](#database-schemas)
10. [Authentication Flow](#authentication-flow)
11. [Security](#security)
12. [File Upload](#file-upload)
13. [Real-time Features](#real-time-features)
14. [Theming](#theming)
15. [Deployment](#deployment)

---

## Overview

**CoreChat** is a full-stack, real-time chat application built with modern web technologies. It supports private and group messaging, voice/video calls (WebRTC signaling), file sharing, end-to-end message encryption, online/offline status tracking, and comprehensive privacy settings.

### Key Features

- **Authentication**: Email + password login with OTP verification
- **Real-time Chat**: Private and group conversations with typing indicators
- **End-to-End Encryption**: AES-256 message encryption via CryptoJS
- **File Sharing**: Images, videos, audio, documents (size-limited)
- **Voice/Video Calls**: WebRTC signaling via Socket.IO
- **Online Status**: Real-time presence tracking with privacy controls
- **Email Notifications**: Configurable per-user notification preferences
- **Privacy Settings**: Profile image, last seen, and online status visibility
- **Dark/Light Theme**: Full CSS variable-based theming
- **Responsive UI**: Desktop sidebar + mobile bottom navigation

---

## Architecture

```
┌─────────────┐       ┌────────────────┐       ┌──────────┐
│   React SPA │◄─────►│  NestJS API    │◄─────►│ MongoDB  │
│  (Vite)     │  HTTP  │  (REST + WS)   │       │          │
│  Port 5173  │       │  Port 3001     │       │ Port 27017│
└──────┬──────┘       └───────┬────────┘       └──────────┘
       │                      │
       │  Socket.IO           │  Nodemailer
       │  (real-time)         │  (email)
       └──────────────────────┘
```

### Monorepo Structure

The project uses a simple monorepo with `concurrently` to run both the client and server from the root.

---

## Tech Stack

### Frontend (`client/`)

| Technology       | Purpose                          |
| ---------------- | -------------------------------- |
| React 18         | UI library                       |
| TypeScript       | Type safety                      |
| Vite             | Build tool & dev server          |
| React Router v6  | Client-side routing              |
| Zustand          | Lightweight state management     |
| Socket.IO Client | Real-time communication          |
| Axios            | HTTP client with interceptors    |
| date-fns         | Date formatting                  |
| react-icons      | Icon library (Heroicons v2)      |
| react-hot-toast  | Toast notifications              |
| emoji-picker-react | Emoji selection                |
| simple-peer      | WebRTC peer connections          |

### Backend (`server/`)

| Technology       | Purpose                          |
| ---------------- | -------------------------------- |
| NestJS 10        | Node.js framework                |
| TypeScript       | Type safety                      |
| Mongoose         | MongoDB ODM                      |
| Passport + JWT   | Authentication                   |
| Socket.IO        | WebSocket server                 |
| bcryptjs         | Password hashing                 |
| CryptoJS         | AES message encryption           |
| Nodemailer       | Email delivery (SMTP)            |
| Multer           | File upload handling             |
| Sharp            | Image processing                 |
| Helmet           | HTTP security headers            |
| Compression      | Response compression             |
| @nestjs/throttler | Rate limiting                   |
| @nestjs/swagger  | API documentation                |

---

## Project Structure

```
chat/
├── package.json              # Root monorepo scripts
├── TECHNICAL_DOCS.md
│
├── server/                   # NestJS Backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── .env                  # Environment variables
│   ├── .env.example
│   └── src/
│       ├── main.ts           # Bootstrap (CORS, Swagger, Helmet)
│       ├── app.module.ts     # Root module
│       ├── common/
│       │   ├── decorators/   # @CurrentUser()
│       │   ├── guards/       # JwtAuthGuard, WsJwtGuard
│       │   └── services/     # EncryptionService, EmailService
│       └── modules/
│           ├── auth/         # Register, Login, OTP, JWT
│           ├── users/        # Profile, Privacy, Friends, Block
│           ├── chat/         # Conversations, Messages, Gateway
│           ├── group/        # Group management
│           ├── calls/        # WebRTC signaling gateway
│           ├── notifications/# In-app + email notifications
│           ├── settings/     # App configuration
│           └── upload/       # File upload (Multer)
│
├── client/                   # React Frontend
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.tsx          # Entry point
│       ├── App.tsx           # Router configuration
│       ├── vite-env.d.ts
│       ├── types/index.ts    # TypeScript interfaces
│       ├── styles/globals.css# CSS variables, reset, utilities
│       ├── services/
│       │   ├── api.ts        # Axios instance + all API modules
│       │   └── socket.ts     # Socket.IO service singleton
│       ├── stores/
│       │   ├── authStore.ts  # Zustand auth + theme store
│       │   └── chatStore.ts  # Zustand chat state store
│       ├── components/
│       │   └── common/       # Avatar, Button, Input
│       └── pages/
│           ├── auth/         # Splash, Login, Register, VerifyOTP
│           ├── layout/       # AppLayout (sidebar + bottom nav)
│           ├── chat/         # ChatListPage, ChatRoomPage
│           ├── calls/        # CallsPage
│           ├── contacts/     # ContactsPage
│           └── settings/     # SettingsPage, ProfilePage
```

---

## Environment Setup

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **MongoDB** 6+ (local or Atlas connection string)
- **npm** 9+ or **yarn** 1.22+

### 1. Clone and Install

```bash
cd chat
npm install           # Installs root dependencies (concurrently)
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Configure Environment Variables

Copy `server/.env.example` to `server/.env` and fill in the values:

```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/corechat

# JWT
JWT_SECRET=your-very-long-random-jwt-secret-key
JWT_REFRESH_SECRET=your-very-long-random-jwt-refresh-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="CoreChat" <noreply@corechat.com>

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key!

# File Uploads
MAX_FILE_SIZE=26214400       # 25MB
MAX_IMAGE_SIZE=10485760      # 10MB
MAX_VIDEO_SIZE=52428800      # 50MB

# WebRTC
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=
TURN_USERNAME=
TURN_PASSWORD=

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173
```

### 3. Start MongoDB

```bash
# If running locally:
mongod --dbpath /path/to/data
# Or use MongoDB Atlas connection string in MONGODB_URI
```

---

## Running the Application

### Development (both servers)

```bash
npm run dev          # Starts server (port 3001) + client (port 5173)
```

### Individual servers

```bash
npm run dev:server   # NestJS dev server with watch mode
npm run dev:client   # Vite dev server with HMR
```

### Production Build

```bash
npm run build:server   # Compiles TypeScript to dist/
npm run build:client   # Vite production build to client/dist/
npm start              # Runs compiled server
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

Swagger API docs available at [http://localhost:3001/api/docs](http://localhost:3001/api/docs).

---

## API Reference

Base URL: `http://localhost:3001/api/v1`

### Authentication

| Method | Endpoint                | Auth | Description                  |
| ------ | ----------------------- | ---- | ---------------------------- |
| POST   | `/auth/register`        | No   | Register new user            |
| POST   | `/auth/login`           | No   | Login with email + password  |
| POST   | `/auth/verify-otp`      | No   | Verify email OTP             |
| POST   | `/auth/send-otp`        | No   | Resend OTP                   |
| POST   | `/auth/forgot-password` | No   | Send password reset OTP      |
| POST   | `/auth/reset-password`  | No   | Reset password with OTP      |
| POST   | `/auth/refresh`         | No   | Refresh access token         |
| POST   | `/auth/logout`          | Yes  | Logout (invalidate tokens)   |

### Users

| Method | Endpoint                  | Auth | Description                  |
| ------ | ------------------------- | ---- | ---------------------------- |
| GET    | `/users/me`               | Yes  | Get current user profile     |
| PUT    | `/users/me`               | Yes  | Update profile               |
| PATCH  | `/users/me/avatar`        | Yes  | Update avatar (multipart)    |
| PATCH  | `/users/me/privacy`       | Yes  | Update privacy settings      |
| DELETE | `/users/me`               | Yes  | Delete account               |
| GET    | `/users/search?q=`        | Yes  | Search users                 |
| GET    | `/users/friends`          | Yes  | Get friends list             |
| GET    | `/users/contacts`         | Yes  | Get contacts                 |
| GET    | `/users/:id`              | Yes  | Get user public profile      |
| PATCH  | `/users/:id/friend`       | Yes  | Add friend                   |
| DELETE | `/users/:id/friend`       | Yes  | Remove friend                |
| PATCH  | `/users/:id/block`        | Yes  | Block user                   |
| DELETE | `/users/:id/block`        | Yes  | Unblock user                 |

### Chat

| Method | Endpoint                                   | Auth | Description              |
| ------ | ------------------------------------------ | ---- | ------------------------ |
| GET    | `/chat/conversations`                      | Yes  | List all conversations   |
| POST   | `/chat/conversations`                      | Yes  | Create/get private chat  |
| POST   | `/chat/conversations/group`                | Yes  | Create group             |
| GET    | `/chat/conversations/:id`                  | Yes  | Get conversation details |
| GET    | `/chat/conversations/:id/messages`         | Yes  | Get messages (paginated) |
| POST   | `/chat/messages`                           | Yes  | Send text message        |
| POST   | `/chat/messages/file`                      | Yes  | Send file message        |
| DELETE | `/chat/messages/:id`                       | Yes  | Delete message           |
| POST   | `/chat/conversations/:id/read`             | Yes  | Mark as read             |

### Groups

| Method | Endpoint                           | Auth | Description          |
| ------ | ---------------------------------- | ---- | -------------------- |
| GET    | `/groups/:id`                      | Yes  | Get group info       |
| PUT    | `/groups/:id`                      | Yes  | Update group         |
| POST   | `/groups/:id/members/:memberId`    | Yes  | Add member           |
| DELETE | `/groups/:id/members/:memberId`    | Yes  | Remove member        |
| POST   | `/groups/:id/admins/:memberId`     | Yes  | Make admin           |
| POST   | `/groups/:id/leave`                | Yes  | Leave group          |

### Notifications

| Method | Endpoint                       | Auth | Description          |
| ------ | ------------------------------ | ---- | -------------------- |
| GET    | `/notifications?page=1`        | Yes  | Get notifications    |
| PATCH  | `/notifications/:id/read`      | Yes  | Mark as read         |
| PATCH  | `/notifications/read-all`      | Yes  | Mark all as read     |
| DELETE | `/notifications/:id`           | Yes  | Delete notification  |

### Calls & Settings

| Method | Endpoint           | Auth | Description          |
| ------ | ------------------ | ---- | -------------------- |
| GET    | `/calls/config`    | Yes  | Get ICE server config|
| GET    | `/settings/app`    | No   | Get app config       |

### Upload

| Method | Endpoint            | Auth | Description         |
| ------ | ------------------- | ---- | ------------------- |
| POST   | `/upload/avatar`    | Yes  | Upload avatar       |
| POST   | `/upload/file`      | Yes  | Upload single file  |
| POST   | `/upload/files`     | Yes  | Upload multiple     |

---

## WebSocket Events

### Chat Namespace (`/chat`)

**Connection**: Requires JWT token as query parameter `token`.

#### Client → Server

| Event              | Payload                                                   | Description            |
| ------------------ | --------------------------------------------------------- | ---------------------- |
| `conversation:join`| `{ conversationId }`                                      | Join conversation room |
| `conversation:leave`| `{ conversationId }`                                     | Leave conversation room|
| `message:send`     | `{ conversationId, content, type?, replyTo? }`            | Send message           |
| `message:read`     | `{ conversationId }`                                      | Mark messages read     |
| `typing:start`     | `{ conversationId }`                                      | Start typing indicator |
| `typing:stop`      | `{ conversationId }`                                      | Stop typing indicator  |
| `users:online`     | —                                                         | Request online users   |

#### Server → Client

| Event              | Payload                                                   | Description            |
| ------------------ | --------------------------------------------------------- | ---------------------- |
| `message:new`      | `Message object`                                          | New message received   |
| `message:read`     | `{ conversationId, userId }`                              | Messages read by user  |
| `user:online`      | `{ userId }`                                              | User came online       |
| `user:offline`     | `{ userId }`                                              | User went offline      |
| `users:online`     | `string[]` (user IDs)                                     | Current online users   |
| `typing:start`     | `{ conversationId, userId }`                              | User started typing    |
| `typing:stop`      | `{ conversationId, userId }`                              | User stopped typing    |

### Calls Namespace (`/calls`)

#### Client → Server

| Event              | Payload                                                   | Description            |
| ------------------ | --------------------------------------------------------- | ---------------------- |
| `call:initiate`    | `{ to, type, offer }`                                     | Start call             |
| `call:answer`      | `{ to, answer }`                                          | Answer call            |
| `call:ice-candidate`| `{ to, candidate }`                                      | ICE candidate          |
| `call:end`         | `{ to }`                                                  | End call               |
| `call:reject`      | `{ to }`                                                  | Reject call            |

#### Server → Client

| Event              | Payload                                                   | Description            |
| ------------------ | --------------------------------------------------------- | ---------------------- |
| `call:incoming`    | `{ from, type, offer }`                                   | Incoming call          |
| `call:answered`    | `{ from, answer }`                                        | Call was answered      |
| `call:ice-candidate`| `{ from, candidate }`                                    | ICE candidate          |
| `call:ended`       | `{ from }`                                                | Call ended             |
| `call:rejected`    | `{ from }`                                                | Call was rejected      |

---

## Database Schemas

### User
- `name`, `email`, `phone`, `password` (hashed)
- `bio`, `avatar`, `username`, `displayName`, `address`
- `status` (online/offline/away), `lastSeen`
- `otp`, `otpExpiry`, `isVerified`, `isDeleted`
- `profileImagePrivacy`, `lastSeenPrivacy`, `onlineStatusPrivacy` (everyone/friends/nobody)
- `callsEnabled`, `emailNotificationsEnabled`, `pushNotificationsEnabled`, etc.
- `friends[]`, `blockedUsers[]`

### Message
- `sender` (User ref), `conversation` (Conversation ref)
- `type` (text/image/video/audio/file/voice_note/system)
- `content` (AES encrypted), `fileUrl`, `fileName`, `fileSize`, `mimeType`
- `status` (sent/delivered/read), `readBy[]`, `deliveredTo[]`
- `replyTo` (Message ref), `isDeleted`

### Conversation
- `type` (private/group), `participants[]` (User refs)
- Group fields: `groupName`, `groupDescription`, `groupAvatar`, `groupAdmin`, `groupAdmins[]`, `tags[]`
- `lastMessage` (Message ref), `unreadCounts` (Map), `typingUsers[]`

### Notification
- `recipient`, `sender` (User refs)
- `type` (message/group_invite/call_missed/friend_request/system)
- `title`, `body`, `isRead`, `metadata`

---

## Authentication Flow

1. **Register**: User submits name, email, password → Account created → OTP sent to email
2. **Verify OTP**: User enters 6-digit OTP → Account verified → JWT tokens issued
3. **Login**: Email + password → If verified, JWT tokens issued; if not, OTP re-sent
4. **Token Refresh**: Access token (1h) + Refresh token (7d) → Auto-refresh via Axios interceptor
5. **Logout**: Invalidates tokens, clears cookies, disconnects sockets

### JWT Structure
- **Access Token**: `{ sub: userId, email }` — expires in 1 hour
- **Refresh Token**: `{ sub: userId }` — expires in 7 days
- Refresh token also set as HTTP-only cookie on `/api/v1/auth/refresh`

---

## Security

- **Helmet**: Sets secure HTTP headers (XSS, Content-Type sniffing, etc.)
- **Rate Limiting**: `@nestjs/throttler` — 10 requests per 60 seconds per IP (configurable)
- **CORS**: Restricted to `CLIENT_URL` origin
- **Input Validation**: `class-validator` + `class-transformer` via NestJS `ValidationPipe`
- **Password Hashing**: bcryptjs with 12 salt rounds
- **Message Encryption**: AES-256 (CryptoJS) — messages encrypted before DB storage
- **File Validation**: MIME type checking + size limits per file type
- **JWT Guards**: Protect all authenticated routes; WebSocket connections authenticated via token

---

## File Upload

### Limits

| Type    | Max Size | Allowed MIME Types                        |
| ------- | -------- | ----------------------------------------- |
| Image   | 10 MB    | image/jpeg, image/png, image/gif, image/webp |
| Video   | 50 MB    | video/mp4, video/webm, video/quicktime    |
| Audio   | 25 MB    | audio/mpeg, audio/wav, audio/ogg, audio/webm |
| File    | 25 MB    | Any                                       |

Files are stored in `server/uploads/` directory with unique filenames (UUID-based).

---

## Real-time Features

### Online/Offline Status
- On socket connect → user marked online, broadcasted to all
- On disconnect → user marked offline with `lastSeen` timestamp
- Online users tracked in-memory (`Map<userId, Set<socketId>>`)

### Typing Indicators
- Client emits `typing:start` → server broadcasts to conversation room
- Client emits `typing:stop` after 2 seconds of inactivity

### Message Delivery
- Messages sent via socket → saved to DB → broadcasted to conversation room
- Messages encrypted server-side before storage, decrypted on retrieval
- Read receipts tracked per-user in `readBy[]` array

---

## Theming

CSS variables are defined in `client/src/styles/globals.css` under `[data-theme="light"]` and `[data-theme="dark"]` selectors.

### Primary Colors
- Light: `#0D7C66` (teal)
- Dark: `#10A37F` (brighter teal)

### Toggle Theme
```typescript
const { toggleTheme, theme } = useAuthStore();
// Stores in localStorage as "theme" key
// Sets data-theme attribute on <html>
```

---

## Deployment

### Docker (recommended)

```dockerfile
# server/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use strong, unique `JWT_SECRET` and `ENCRYPTION_KEY`
- Configure proper SMTP credentials
- Set `CLIENT_URL` to your production domain
- Use MongoDB Atlas or managed DB with proper auth

### Static Files
- Build client: `cd client && npm run build`
- Serve `client/dist/` via Nginx or the NestJS static serve module

---

## License

This project is proprietary software by **Corework**. All rights reserved.
