# Implementation Reference

This file is the running technical reference for PulseChat.
Update it as modules are completed.

---

## Stack

### Frontend (Next.js App)
| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| UI | Shadcn/UI + Tailwind CSS |
| Icons | @tabler/icons-react |
| Client state | Zustand |
| Server state | TanStack Query v5 |
| Forms & validation | TanStack Form + Zod |
| Networking | Axios |
| Realtime client | socket.io-client |
| Auth | Better Auth |
| Animations | Framer Motion |
| Date handling | date-fns |
| File uploads | react-dropzone |
| Virtualized lists | @tanstack/react-virtual |
| Emoji picker | emoji-picker-react |
| Formatter | Biome |
| Package manager | pnpm |

### Backend (Decoupled Socket.IO Server)
| Layer | Choice |
|---|---|
| Runtime | Node.js + Express |
| Realtime | Socket.IO |
| Cache & presence | Redis (also Socket.IO adapter) |
| ORM | Prisma + PostgreSQL |
| File storage | S3-compatible (AWS S3 / Cloudflare R2) |
| Auth middleware | JWT / Better Auth integration |

---

## ⚠️ Breaking changes in Next.js 16

- `middleware.ts` is **deprecated** → renamed to **`proxy.ts`**
- Export function must be named **`proxy`** (not `middleware`)
- `export function proxy(request: NextRequest) {}` — same API, different name
- `unauthorized()` and `forbidden()` require `experimental.authInterrupts: true` in `next.config.ts`

---

## Architecture

```
Frontend (Next.js)
    │
    ├─ REST API (Next.js API Routes)
    │     • Auth (Better Auth)
    │     • Users / channels / messages (CRUD)
    │     • File uploads → S3
    │
    └─ Socket.IO Client ──► Socket.IO Server (Node.js + Express)
                                  │
                                  ├─ Redis (adapter, presence, rate limiting)
                                  ├─ PostgreSQL (Prisma ORM)
                                  └─ S3-Compatible Storage (AWS S3 / R2)
```

---

## Key files

### Frontend
| File | Purpose |
|---|---|
| `proxy.ts` | Route guard — auth check, redirects unauthenticated users |
| `routes.ts` | Centralized route constants: `publicRoutes`, `authRoutes`, `appRoutes`, `apiAuthPrefix` |
| `lib/auth.tsx` | Better Auth server config |
| `lib/auth-client.tsx` | Better Auth client (`authClient`) — use in Client Components |
| `lib/session.ts` | **DAL** — `getServerSession`, `getServerUser`, `requireAuth` |
| `lib/prisma-client.ts` | Prisma singleton |
| `lib/query-client.ts` | TanStack Query client factory |
| `lib/axios.ts` | Axios instance with base URL + auth interceptors |
| `lib/socket.ts` | Socket.IO client singleton — connect/disconnect helpers |
| `lib/upload.ts` | `uploadFile(file)` → presigned URL request → S3 upload → returns CDN URL |
| `components/providers.tsx` | `<Providers>` — wraps app with QueryClientProvider + SocketProvider (Client Component) |
| `store/chat.ts` | Zustand store — active channel, draft messages, UI state |
| `store/presence.ts` | Zustand store — online users map (populated by socket events) |
| `prisma/schema.prisma` | Full DB schema |
| `prisma/seeder.ts` | Seeds roles, default channels, sample users |
| `generated/client/` | Prisma generated client output |
| `schemas/index.ts` | Zod schemas — `SignInSchema`, `SignUpSchema`, `ChannelCreateSchema`, `MessageSchema` |
| `types/db.ts` | Branded ID types, generic DB utility types |

### Backend (Socket.IO server — `server/` directory)
| File | Purpose |
|---|---|
| `server/index.ts` | Express + Socket.IO server entry point |
| `server/socket/index.ts` | Socket.IO setup — Redis adapter, middleware, event registration |
| `server/socket/events/messages.ts` | `message:new`, `message:edit`, `message:delete` handlers |
| `server/socket/events/typing.ts` | `typing:start`, `typing:stop` handlers |
| `server/socket/events/presence.ts` | `connect`, `disconnect`, presence update broadcast |
| `server/socket/events/channels.ts` | `channel:join`, `channel:leave`, room management |
| `server/socket/events/reactions.ts` | `reaction:add`, `reaction:remove` handlers |
| `server/socket/events/threads.ts` | `thread:reply`, `thread:subscribe` handlers |
| `server/middleware/auth.ts` | JWT verification for socket handshake + REST routes |
| `server/middleware/rateLimit.ts` | Redis-backed rate limiter |
| `server/dal/messages.ts` | Message CRUD — `createMessage`, `getMessages`, `editMessage`, `deleteMessage` |
| `server/dal/channels.ts` | Channel CRUD — `createChannel`, `getChannel`, `addMember`, `removeMember` |
| `server/dal/users.ts` | User read operations — `getUserById`, `getUsersByChannel` |
| `server/dal/reactions.ts` | `addReaction`, `removeReaction`, `getReactions` |
| `server/dal/threads.ts` | `createThread`, `getThreadMessages`, `addThreadReply` |
| `server/dal/attachments.ts` | `createAttachment`, `getAttachments` |
| `server/dal/presence.ts` | Redis presence ops — `setOnline`, `setOffline`, `getOnlineUsers` |
| `server/services/upload.ts` | S3 presigned URL generation + CDN URL resolution |
| `server/services/search.ts` | Full-text message search via PostgreSQL `tsvector` |

---

## Database schema (Prisma + PostgreSQL)

### Core models

```
User         — id, username, email, passwordHash, avatarUrl, bio, status, createdAt
Role         — id, name, permissions (JSON)
UserRole     — userId, roleId
Channel      — id, name, description, type (PUBLIC/PRIVATE/DIRECT), createdBy, createdAt
ChannelMember — channelId, userId, role (OWNER/ADMIN/MEMBER), joinedAt
Message      — id, channelId, senderId, content, editedAt, deletedAt, threadId, createdAt
Thread       — id, parentMessageId, channelId, createdAt
Attachment   — id, messageId, url, type (IMAGE/VIDEO/DOCUMENT/AUDIO), size, name
Reaction     — id, messageId, userId, emoji, createdAt
ReadReceipt  — id, messageId, userId, readAt
WebhookEvent — id, provider, providerEventId, payload, processedAt, createdAt @@unique([provider, providerEventId])
```

### Redis (ephemeral — not in Prisma)
| Key pattern | Purpose |
|---|---|
| `presence:user:{userId}` | Online status + lastSeen timestamp |
| `presence:channel:{channelId}` | Set of online user IDs in channel |
| `ratelimit:{userId}:{action}` | Rate limit counters per user per action |
| `typing:{channelId}` | Set of currently-typing user IDs |

---

## Real-time events (Socket.IO)

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `connect` | Client → Server | — | Register presence, join user's channels |
| `disconnect` | Client → Server | — | Mark offline, broadcast presence update |
| `message:new` | Client → Server | `{ channelId, content, attachments?, threadId? }` | Send new message |
| `message:receive` | Server → Clients | `Message` object | Broadcast new message to channel room |
| `message:edit` | Client → Server | `{ messageId, content }` | Edit own message |
| `message:edited` | Server → Clients | `{ messageId, content, editedAt }` | Broadcast edit |
| `message:delete` | Client → Server | `{ messageId }` | Soft-delete own message |
| `message:deleted` | Server → Clients | `{ messageId }` | Broadcast deletion |
| `message:read` | Client → Server | `{ messageId, channelId }` | Update read receipt |
| `typing:start` | Client → Server | `{ channelId }` | User started typing |
| `typing:stop` | Client → Server | `{ channelId }` | User stopped typing |
| `typing:update` | Server → Clients | `{ channelId, typingUsers: string[] }` | Broadcast typing state |
| `reaction:add` | Client → Server | `{ messageId, emoji }` | Add emoji reaction |
| `reaction:remove` | Client → Server | `{ messageId, emoji }` | Remove emoji reaction |
| `reaction:update` | Server → Clients | `{ messageId, reactions }` | Broadcast reaction state |
| `channel:join` | Client → Server | `{ channelId }` | Join a channel room |
| `channel:leave` | Client → Server | `{ channelId }` | Leave a channel room |
| `presence:update` | Server → Clients | `{ userId, status, lastSeen }` | User came online / went offline |
| `thread:reply` | Client → Server | `{ threadId, content }` | Reply in thread |
| `thread:receive` | Server → Clients | `Message` object | Broadcast thread reply |

---

## Auth pattern

### Server Components / API Routes (Next.js)
```ts
import { requireAuth, getServerUser } from '@/lib/session'

const user = await requireAuth()    // throws unauthorized() if not logged in
const user = await getServerUser()  // returns null if not logged in
```

### Client Components
```ts
import { authClient } from '@/lib/auth-client'
const { data: session } = authClient.useSession()
```

### Socket.IO server middleware
```ts
// server/middleware/auth.ts
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token
  const user = await verifyJwt(token)
  if (!user) return next(new Error('Unauthorized'))
  socket.data.user = user
  next()
})
```

---

## App routes

### Public routes
| URL | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Landing / marketing page |
| `/auth/signin` | `app/auth/signin/page.tsx` | Sign-in form |
| `/auth/signup` | `app/auth/signup/page.tsx` | Sign-up form |
| `/unauthorized` | `app/unauthorized.tsx` | 401 page |

### App routes (authenticated)
| URL | Notes |
|---|---|
| `/chat` | Main chat layout — sidebar + active channel |
| `/chat/[channelId]` | Channel view — messages, members, thread panel |
| `/chat/dm/[userId]` | Direct message view |
| `/chat/threads` | All threads the user is participating in |
| `/settings` | User settings — profile, notifications, appearance |
| `/admin` | Admin panel — users, channels, roles (admin only) |

### API routes
| URL | File | Notes |
|---|---|---|
| `/api/auth/[...all]` | `app/api/auth/[...all]/route.ts` | Better Auth handler |
| `/api/channels` | `app/api/channels/route.ts` | Create / list channels |
| `/api/channels/[id]` | `app/api/channels/[id]/route.ts` | Get / update / delete channel |
| `/api/channels/[id]/members` | `app/api/channels/[id]/members/route.ts` | Add / remove members |
| `/api/messages` | `app/api/messages/route.ts` | Paginated message history |
| `/api/messages/[id]` | `app/api/messages/[id]/route.ts` | Edit / delete message |
| `/api/upload/presign` | `app/api/upload/presign/route.ts` | Get S3 presigned URL for client upload |
| `/api/users/[id]` | `app/api/users/[id]/route.ts` | Get / update user profile |
| `/api/search` | `app/api/search/route.ts` | Full-text message search |

---

## File upload flow

1. Client calls `POST /api/upload/presign` with `{ filename, contentType, size }`
2. Server validates auth + file type, generates S3 presigned PUT URL
3. Client uploads directly to S3 using the presigned URL (`PUT`)
4. Client calls `POST /api/messages` (or sends `message:new` socket event) with the CDN URL in `attachments`
5. CDN URL stored in `Attachment.url` — served directly from S3/R2

---

## Module build status

| # | Module | Status |
|---|---|---|
| 1 | Schema + DB setup | ✅ Done |
| 2 | Auth + route guards | ✅ Done |
| 3 | Socket.IO server + Redis adapter | ⬜ Todo |
| 4 | Channels (create, join, leave, list) | ⬜ Todo |
| 5 | Messaging (send, edit, delete, history) | ⬜ Todo |
| 6 | Presence + typing indicators | ⬜ Todo |
| 7 | Read receipts | ⬜ Todo |
| 8 | Threads | ⬜ Todo |
| 9 | Reactions | ⬜ Todo |
| 10 | File & media uploads (S3) | ⬜ Todo |
| 11 | Direct messages | ⬜ Todo |
| 12 | Search | ⬜ Todo |
| 13 | Notifications | ⬜ Todo |
| 14 | Admin panel | ⬜ Todo |
| 15 | Public landing page | ⬜ Todo |
| 16 | npm package extraction | ⬜ Todo |

---

## DB conventions

- All IDs: UUID generated by PostgreSQL (`gen_random_uuid()`)
- All timestamps: UTC
- Table names: snake_case via `@@map()`
- Prisma field names: camelCase
- Soft deletes on `Message` via `deletedAt` timestamp — never hard-delete messages
- `generateId: false` in Better Auth config (IDs generated by DB, not BA)

---

## Component directories

| Directory | Contents |
|---|---|
| `components/ui/` | Shadcn/UI primitives |
| `components/chat/` | Chat shell, channel list, message list, message input, thread panel |
| `components/messages/` | `MessageBubble`, `MessageActions`, `EditMessageForm`, `DeleteConfirm` |
| `components/channels/` | `ChannelHeader`, `ChannelList`, `ChannelItem`, `CreateChannelModal`, `MemberList` |
| `components/presence/` | `PresenceIndicator`, `TypingIndicator`, `UserAvatar` |
| `components/reactions/` | `ReactionPicker`, `ReactionBar`, `EmojiButton` |
| `components/threads/` | `ThreadPanel`, `ThreadMessage`, `ThreadInput` |
| `components/upload/` | `FileDropzone`, `AttachmentPreview`, `UploadProgress` |
| `components/auth/` | `SignInForm`, `SignUpForm`, `SignOutButton` |
| `components/shared/` | `Header`, `Logo`, `ThemeSwitch`, `Loader`, `EmptyState` |

---

## Zustand stores

| Store | File | State |
|---|---|---|
| Chat | `store/chat.ts` | `activeChannelId`, `draft messages map`, `openThreadId`, `sidebarOpen` |
| Presence | `store/presence.ts` | `onlineUsers: Map<userId, { status, lastSeen }>` |
| UI | `store/ui.ts` | `theme`, `notificationsEnabled`, `soundEnabled` |

---

## Required env vars

### Frontend (`.env.local`)
```
NEXT_PUBLIC_SOCKET_URL      # Socket.IO server URL (e.g. http://localhost:4000)
NEXT_PUBLIC_APP_URL         # Frontend base URL
BETTER_AUTH_SECRET          # Better Auth signing secret
BETTER_AUTH_URL             # Same as NEXT_PUBLIC_APP_URL
DATABASE_URL                # PostgreSQL connection string
```

### Backend Socket.IO server
```
PORT                        # Socket.IO server port (default 4000)
DATABASE_URL                # PostgreSQL connection string
REDIS_URL                   # Redis connection string
JWT_SECRET                  # JWT signing secret (shared with frontend if using JWT)
S3_ENDPOINT                 # S3-compatible endpoint URL
S3_ACCESS_KEY_ID            # S3 access key
S3_SECRET_ACCESS_KEY        # S3 secret key
S3_BUCKET                   # S3 bucket name
S3_PUBLIC_URL               # CDN / public URL prefix for served files
```

---

## Notes for future sessions

- `lib/auth.tsx` uses JSX (email templates if added) — keep as `.tsx`
- `proxy.ts` fetches `/api/auth/get-session` via HTTP (edge-safe, no Prisma)
- `lib/session.ts` uses Prisma directly — **server-only**, never import in Client Components
- Socket.IO client singleton in `lib/socket.ts` should be lazy-initialized (connect only after auth)
- Presence state lives in Redis only — never persisted to PostgreSQL
- `store/presence.ts` is populated exclusively by `presence:update` socket events
- Virtualized list (`@tanstack/react-virtual`) is required for channels with >100 messages to prevent DOM bloat
- File uploads go client → S3 directly (presigned URL) — the app server never streams file bytes
- Shadcn components are in `components/ui/`
- `next.config.ts` enables `reactCompiler: true` and `authInterrupts: true`
