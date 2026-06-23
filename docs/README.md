# CodeCollab — Project Documentation

> **Real-time collaborative code editor** — Google Docs for code.  
> Built with React + Vite, Monaco Editor, Yjs CRDTs, Node.js, PostgreSQL, and Redis.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [Phase 1: Setup + Monaco Editor](#phase-1-setup--monaco-editor)
7. [Phase 2: Auth + Room Creation](#phase-2-auth--room-creation)
8. [Phase 3-5: Sync Engine, Presence, & Persistence](#phase-3-5-sync-engine-presence--persistence)
9. [Development Phases Summary](#development-phases-summary)
10. [Deployment Guide](#deployment-guide)
11. [Environment Variables](#environment-variables)
12. [Running Locally](#running-locally)

---

## Project Overview

**CodeCollab** is a production-grade, real-time collaborative code editor that allows multiple users to edit the same file simultaneously from different browsers. Key features:

- **Real-time sync** — Edits appear instantly for all users via CRDT (Yjs)
- **Live cursors** — See other users' cursor positions with coloured carets
- **Conflict resolution** — CRDTs guarantee documents always converge, no locking needed
- **50+ languages** — Monaco Editor (VS Code engine) with full syntax highlighting
- **Session history** — Save and browse code snapshots
- **Auth** — Email/password + Google/GitHub OAuth
- **Persistence** — Redis for fast state reload, PostgreSQL for user/room/snapshot data
- **Free deployment** — Vercel + Render + Railway + Supabase + Upstash (₹0 total)

### The Core Problem: Why This Is Hard

If two users both start with `"Hello"` and one inserts `"World"` at position 5 while the other deletes `"Hello"` at position 0, applying both edits with raw character positions corrupts the document. This is the **lost update problem**.

### The Solution: CRDTs

**CRDT (Conflict-free Replicated Data Type)** — specifically **Yjs** which implements the **YATA algorithm**:
- Every character gets a **unique ID** (clientId + logical clock) instead of a position
- Characters know **what they come after**, not their index
- When two clients insert at the same spot, a **deterministic tiebreaker** (client ID) decides order
- **Mathematically guaranteed** to converge to the same state on all clients

---

## Architecture

### 4 Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: CLIENT                                                │
│  React + Vite │ Monaco Editor │ Yjs Y.Doc/Y.Text │ y-monaco    │
│  y-websocket provider │ y-indexeddb provider                    │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: SYNC SERVER                                           │
│  y-websocket server (port 1234)                                 │
│  Receives CRDT updates → broadcasts to all room members         │
│  Does NOT parse content — just relays binary Yjs blobs          │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: PERSISTENCE                                           │
│  PostgreSQL (Supabase) — users, rooms, snapshots                │
│  Redis (Upstash) — serialised Y.Doc state per room              │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: AWARENESS                                             │
│  Yjs awareness protocol — cursor positions, usernames, colours  │
│  Ephemeral (not persisted) — lost on disconnect                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Concurrent Edit

```
User A types 'x'
    │
    ▼
y-monaco creates Y.Text insert op (clientA, clock:15)
    │
    ▼
Applied locally → Monaco shows 'x' instantly (0ms latency)
    │
    ▼
Yjs encodes as binary blob (~30 bytes)
    │
    ▼
WebsocketProvider sends to sync server
    │
    ▼
Sync server broadcasts to all room members
    │
    ▼
User B's Y.Doc applies remote update (CRDT merge)
    │
    ▼
Monaco re-renders — both documents identical
    │
    ▼
Sync server writes full Y.Doc state to Redis
```

---

## Tech Stack

| Technology | Role | Why |
|---|---|---|
| **React + Vite** | Frontend framework | Component model, fast HMR, familiar |
| **Monaco Editor** | Code editor | Same engine as VS Code, 50+ languages, built-in themes |
| **Yjs** | CRDT engine | Industry standard, used by Notion/Gitpod, offline-capable |
| **y-monaco** | Monaco ↔ Yjs binding | Official binding, handles keystroke → CRDT op conversion |
| **y-websocket** | Sync server | Official Yjs WebSocket server, handles rooms + relaying |
| **y-indexeddb** | Offline persistence | Doc survives page refresh without server |
| **Node.js + Express** | REST API | Auth, room management, session history |
| **PostgreSQL (Supabase)** | Database | Users, rooms, snapshots — free tier |
| **Redis (Upstash)** | Doc state cache | Serialised Y.Doc binary per room — instant new-joiner state |
| **Passport.js** | OAuth | Google + GitHub login |
| **Docker Compose** | Local dev | Runs all services together |

---

## Project Structure

```
codecollab/
├── client/                         # React + Vite frontend
│   ├── public/
│   │   └── favicon.svg             # Brand favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor.jsx          # Monaco + Yjs binding (Phase 3+)
│   │   │   ├── CollabCursors.jsx   # Coloured cursor decorations (Phase 4)
│   │   │   ├── Sidebar.jsx         # Online users list
│   │   │   ├── Toolbar.jsx         # Language select, share, download
│   │   │   ├── StatusBar.jsx       # Cursor pos, word count, status
│   │   │   └── HistoryPanel.jsx    # Past session snapshots (Phase 6)
│   │   ├── hooks/
│   │   │   ├── useYjs.js           # Y.Doc + provider setup (Phase 3)
│   │   │   ├── useAwareness.js     # Cursor + presence (Phase 4)
│   │   │   └── useMonaco.js        # Monaco instance ref (Phase 3)
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Create / join room (Phase 2)
│   │   │   └── Room.jsx            # Main editor view (Phase 2)
│   │   ├── App.jsx                 # Root layout + routing
│   │   ├── App.css                 # Layout styles
│   │   ├── index.css               # Design system tokens
│   │   └── main.jsx                # Entry point
│   ├── index.html
│   └── package.json
│
├── server/                         # Node.js REST API (Phase 2)
│   ├── routes/
│   │   ├── auth.js                 # Register, login, OAuth, JWT
│   │   └── rooms.js                # Create room, snapshots, history
│   ├── db.js                       # PostgreSQL (Supabase) connection
│   ├── redis.js                    # Redis (Upstash) client
│   └── index.js                    # Express app entry
│
├── sync-server/                    # y-websocket sync server (Phase 3)
│   ├── server.js                   # Custom y-websocket setup
│   └── persistence.js              # Save/load Y.Doc to Redis
│
├── docs/                           # Documentation
│   ├── README.md                   # This file
│   ├── phase1-screenshot.png       # Phase 1 verification
│   ├── phase2-home.png             # Phase 2 home page
│   └── phase2-auth-modal.png       # Phase 2 auth modal
│
├── docker-compose.yml              # Local dev orchestration (Phase 5)
└── .env                            # Environment variables
```

---

## Database Schema

```sql
-- Users table — authentication + cursor colour preference
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  color TEXT DEFAULT '#F08040',          -- cursor colour
  google_id TEXT,                        -- OAuth: Google
  github_id TEXT,                        -- OAuth: GitHub
  avatar_url TEXT,                       -- OAuth profile picture
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rooms table — collaboration sessions
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,                   -- short nanoid, used as room URL
  name TEXT,
  language TEXT DEFAULT 'javascript',
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Snapshots table — session history
CREATE TABLE snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT REFERENCES rooms(id),
  content TEXT,                          -- full code text at that moment
  saved_at TIMESTAMPTZ DEFAULT now(),
  saved_by UUID REFERENCES users(id)
);
```

---

## Phase 1: Setup + Monaco Editor

**Status**: ✅ Complete  
**Timeline**: Day 1–2  
**Focus**: Frontend foundation — a beautiful, working code editor in the browser

### What Was Built

| Component | File | Purpose |
|---|---|---|
| **Design System** | `src/index.css` | CSS custom properties, dark theme tokens, animations, utilities |
| **Layout Styles** | `src/App.css` | Toolbar, sidebar, editor, statusbar layout |
| **Editor** | `src/components/Editor.jsx` | Monaco Editor with VS Code dark theme, 20 languages, cursor tracking |
| **Toolbar** | `src/components/Toolbar.jsx` | Brand logo, room badge, language selector, share/download/history/sidebar buttons |
| **Sidebar** | `src/components/Sidebar.jsx` | Collaborators list, room info panel, keyboard shortcuts reference |
| **StatusBar** | `src/components/StatusBar.jsx` | Connection status, cursor position, word count, language, encoding |
| **App** | `src/App.jsx` | Root layout composing all components |
| **Favicon** | `public/favicon.svg` | Brand gradient icon |

### Dependencies Installed
```json
{
  "@monaco-editor/react": "latest",
  "react-router-dom": "latest"
}
```

### Features Working
- ✅ Monaco Editor renders with VS Code dark theme
- ✅ JavaScript syntax highlighting with bracket pair colorization
- ✅ Language selector switches between 20 languages (JS, Python, TS, Java, C++, Go, Rust, etc.)
- ✅ Default code templates for JavaScript, Python, TypeScript
- ✅ Cursor position tracking (Ln/Col) in status bar
- ✅ Word count in status bar
- ✅ Smooth cursor animation + font ligatures (JetBrains Mono)
- ✅ Collapsible sidebar with user list
- ✅ Keyboard shortcuts reference panel
- ✅ Premium dark theme with purple accent gradient
- ✅ SVG favicon with brand identity

### How to Run
```bash
cd client
npm install
npm run dev
# Open http://localhost:5173
```

### Screenshot

![Phase 1 — CodeCollab Editor](phase1-screenshot.png)

---

## Phase 2: Auth + Room Creation

**Status**: ✅ Complete  
**Timeline**: Day 3–4  
**Focus**: Backend API + Home page + Auth system

### What Was Built

#### Server (`server/`)

| File | Purpose |
|---|---|
| `index.js` | Express app entry — CORS, sessions, Passport, routes |
| `db.js` | Supabase database layer with in-memory fallback (demo mode) |
| `middleware/auth.js` | JWT generation, verification, `requireAuth` and `optionalAuth` middleware |
| `routes/auth.js` | Register, login, current user, Google/GitHub OAuth flows |
| `routes/rooms.js` | Create room (nanoid), list rooms, room details, snapshots |
| `.env.example` | Environment variable template |
| `.env` | Local dev config (placeholder Supabase credentials) |

#### Client (updated/new)

| File | Purpose |
|---|---|
| `services/api.js` | Centralized API service — token management, HTTP helpers, all endpoints |
| `pages/Home.jsx` | Landing page — hero, create/join room cards, auth modal, room list |
| `pages/Home.css` | Home page styles — premium dark design |
| `pages/Room.jsx` | Editor view with room context — loads room info from API |
| `pages/AuthCallback.jsx` | OAuth callback handler — stores JWT and redirects |
| `App.jsx` | Updated with React Router (/, /room/:id, /auth/callback) |
| `components/Toolbar.jsx` | Added home navigation |
| `components/Sidebar.jsx` | Updated to accept roomInfo and currentUser props |

### API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create account (bcrypt + JWT) |
| POST | `/auth/login` | No | Login (verify + JWT) |
| GET | `/auth/me` | JWT | Get current user profile |
| GET | `/auth/google` | No | Start Google OAuth flow |
| GET | `/auth/google/callback` | — | Google OAuth callback |
| GET | `/auth/github` | No | Start GitHub OAuth flow |
| GET | `/auth/github/callback` | — | GitHub OAuth callback |
| POST | `/rooms` | JWT | Create room (nanoid ID) |
| GET | `/rooms` | JWT | List user's rooms |
| GET | `/rooms/:id` | Optional | Get room details |
| POST | `/rooms/:id/snapshots` | JWT | Save code snapshot |
| GET | `/rooms/:id/snapshots` | Optional | List room snapshots |
| GET | `/health` | No | Health check |

### Demo Mode

The server runs in **demo mode** when Supabase credentials are not configured. In demo mode:
- All data is stored in-memory (lost on server restart)
- Registration, login, and room creation all work normally
- No Supabase account required for local development

### How to Run (Phase 2)
```bash
# Terminal 1: API Server
cd server
npm install
npm run dev    # http://localhost:3001

# Terminal 2: Frontend
cd client
npm run dev    # http://localhost:5173
```

### Screenshots

![Phase 2 — Home Page](phase2-home.png)

![Phase 2 — Auth Modal](phase2-auth-modal.png)

---

## Phase 3-5: Sync Engine, Presence, & Persistence

**Status**: ✅ Complete  
**Timeline**: Week 1–2  
**Focus**: Yjs CRDTs, WebSocket real-time communication, Coloured Cursors, and Upstash Redis document storage

### What Was Built

| Component | File | Purpose |
|---|---|---|
| **Yjs Binding** | `src/hooks/useYjs.js` | Initializes `Y.Doc` and connects `WebsocketProvider` to port 1234. |
| **Monaco Binding** | `src/components/Editor.jsx` | Binds `ytext` to Monaco's text model using `MonacoBinding`. |
| **Awareness Hook** | `src/hooks/useAwareness.js` | Subscribes to `provider.awareness` to track online users' metadata. |
| **Live Cursors** | `Editor.jsx` & `index.css` | Injects remote selections into Monaco to display coloured carets. |
| **Collaborator List** | `src/components/Sidebar.jsx` | Renders dynamic list of live users based on WebSocket state. |
| **Sync Server** | `sync-server/server.js` | Dedicated `y-websocket` Node backend managing real-time peer relay. |
| **Persistence Layer** | `sync-server/persistence.js` | Hooks into `setPersistence` to encode/decode binary state to Upstash Redis. |

### How It Works

1. **Phase 3 (CRDTs)**: The Monaco editor content is bound to `y-monaco`. Typing translates into Yjs operations. The `y-websocket` server relays these binary blobs seamlessly.
2. **Phase 4 (Awareness)**: User names and assigned colors are injected into the Yjs `awareness` local state. Other peers receive these updates and dynamically display floating carets and update the Sidebar online list.
3. **Phase 5 (Persistence)**: The sync-server uses `ioredis` to listen for document changes. Every update is compressed into a binary blob via `Y.encodeStateAsUpdate` and saved to an Upstash Redis database. On server restart or empty room, `bindState` loads the blob via `applyUpdate`.

### Features Working
- ✅ Multi-user real-time typing with zero conflict locking
- ✅ Coloured carets injected directly into Monaco's DOM
- ✅ Real-time online user roster in the Sidebar
- ✅ Uninterrupted WebSocket reconnection mechanisms
- ✅ Serverless Redis document persistence (Upstash)

---

## Development Phases Summary

| Phase | Name | Timeline | Status |
|---|---|---|---|
| 1 | Setup + Monaco Editor | Day 1–2 | ✅ Complete |
| 2 | Auth + Room Creation | Day 3–4 | ✅ Complete |
| 3 | Yjs + y-websocket Sync | Day 5–7 | ✅ Complete |
| 4 | Coloured Cursors + Presence | Week 2, Day 1–3 | ✅ Complete |
| 5 | Redis Persistence | Week 2, Day 4–5 | ✅ Complete |
| 6 | History Snapshots + Features | Week 2, Day 6–7 | ⬜ Pending |
| 7 | Deploy (Vercel + Railway + Render) | Week 3 | ⬜ Pending |

---

## Deployment Guide

| Service | Platform | Cost | Notes |
|---|---|---|---|
| Frontend (React) | **Vercel** | Free | Auto-deploy from GitHub, global CDN |
| REST API (Express) | **Render.com** | Free | Node.js hosting, auto-deploy |
| Sync Server (y-websocket) | **Railway.app** | Free | WebSocket support required |
| Redis | **Upstash** | Free | Serverless Redis, 10k commands/day |
| PostgreSQL | **Supabase** | Free | Managed Postgres, 500MB storage |

**Total cost: ₹0**

---

## Environment Variables

```env
# Server
PORT=3001
DATABASE_URL=postgresql://...@db.supabase.co:5432/postgres
JWT_SECRET=your-secret-key

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Redis (Upstash)
REDIS_URL=redis://default:...@...-redis.upstash.io:6379

# Sync Server
SYNC_SERVER_PORT=1234

# Client
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:1234
```

---

## Running Locally

### Phase 2 (Current)
```bash
# Terminal 1: API Server
cd server
npm install
npm run dev    # http://localhost:3001

# Terminal 2: Frontend
cd client
npm install
npm run dev    # http://localhost:5173
```

### Full Stack (Phase 3+)
```bash
# Terminal 1: Frontend
cd client && npm run dev

# Terminal 2: REST API
cd server && npm run dev

# Terminal 3: Sync Server
cd sync-server && node server.js
```

### With Docker (Phase 5+)
```bash
docker-compose up
```

---

*Last updated: Phase 5 complete — June 2026*
