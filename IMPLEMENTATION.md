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
| Database | Native `pg` (node-postgres) + PostgreSQL 18+ |
| Auth DB adapter | Kysely (via `better-auth/adapters/kysely`) |
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
                                  ├─ PostgreSQL 18+ (native pg)
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
| `lib/db.ts` | `pg.Pool` singleton + Kysely instance (used by Better Auth adapter) |
| `lib/query-client.ts` | TanStack Query client factory |
| `lib/axios.ts` | Axios instance with base URL + auth interceptors |
| `lib/socket.ts` | Socket.IO client singleton — connect/disconnect helpers |
| `lib/upload.ts` | `uploadFile(file)` → presigned URL request → S3 upload → returns CDN URL |
| `components/providers.tsx` | `<Providers>` — wraps app with QueryClientProvider + SocketProvider (Client Component) |
| `store/chat.ts` | Zustand store — active channel, draft messages, UI state |
| `store/presence.ts` | Zustand store — online users map (populated by socket events) |
| `schemas/index.ts` | Zod schemas — `SignInSchema`, `SignUpSchema`, `ChannelCreateSchema`, `MessageSchema` |
| `types/db.ts` | Branded ID types, generic DB utility types |

### Database scripts (`db/` directory)
| File | Purpose |
|---|---|
| `db/migrations/001_schema.sql` | Full DB schema — run on a fresh PostgreSQL 18+ database |
| `db/seeder.ts` | Seeds default channels and admin user (`pnpm seed`) |
| `db/indexer.ts` | Drops all tables in FK-safe order (for clean resets) |
| `db/permissions.json` | Permission slugs used by the seeder |

### Backend (Socket.IO server — `server/` directory)
| File | Purpose |
|---|---|
| `server/index.ts` | Express + Socket.IO server entry point |
| `server/db.ts` | `pg.Pool` instance for the socket server |
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

## Database schema (native PostgreSQL 18+)

### Core models

```
User         — id, username, email, passwordHash, avatarUrl, bio, status, createdAt
Channel      — id, name, description, type (PUBLIC/PRIVATE/DIRECT), createdBy, createdAt
ChannelMember — channelId, userId, role (OWNER/ADMIN/MEMBER), joinedAt
Message      — id, channelId, senderId, content, editedAt, deletedAt, threadId, createdAt
Thread       — id, parentMessageId, channelId, createdAt
Attachment   — id, messageId, url, type (IMAGE/VIDEO/DOCUMENT/AUDIO), size, name
Reaction     — id, messageId, userId, emoji, createdAt
ReadReceipt  — id, messageId, userId, readAt
WebhookEvent — id, provider, providerEventId, payload, processedAt, createdAt UNIQUE(provider, providerEventId)
```

### Redis (ephemeral)
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
| `presence:update` | Server → Clients | `{ userId, status, lastSeen }` | User came online / went offline / went away |
| `presence:away` | Client → Server | — | User tab hidden or idle for 5 min → set status to `away` |
| `presence:back` | Client → Server | — | User returned to tab or became active → set status back to `online` |
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
| `/api/threads/[id]` | `app/api/threads/[id]/route.ts` | Thread by Thread.id or parentMessage.id; creates thread on first open |
| `/api/upload/presign` | `app/api/upload/presign/route.ts` | Get S3 presigned URL for client upload |
| `/api/users/[id]` | `app/api/users/[id]/route.ts` | Get / update user profile |
| `/api/search` | `app/api/search/route.ts` | Full-text message search |
| `/api/notifications` | `app/api/notifications/route.ts` | List notifications (paginated) |
| `/api/notifications/[id]/read` | `app/api/notifications/[id]/read/route.ts` | Mark one notification read |
| `/api/notifications/read-all` | `app/api/notifications/read-all/route.ts` | Mark all notifications read |
| `/api/admin/stats` | `app/api/admin/stats/route.ts` | Admin — user/channel/message counts |
| `/api/admin/users` | `app/api/admin/users/route.ts` | Admin — paginated user list with search |
| `/api/admin/users/[id]` | `app/api/admin/users/[id]/route.ts` | Admin — change role, ban/unban, delete user |
| `/api/admin/channels` | `app/api/admin/channels/route.ts` | Admin — list all channels with stats |
| `/api/admin/channels/[id]` | `app/api/admin/channels/[id]/route.ts` | Admin — update or delete channel |
| `PATCH /api/channels/[id]/mode` | `app/api/channels/[id]/mode/route.ts` | Admin — toggle channel mode (MONITORED ↔ E2E_ENCRYPTED) |

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
| 3 | Socket.IO server + Redis adapter | ✅ Done |
| 4 | Channels (create, join, leave, list) | ✅ Done |
| 5 | Messaging (send, edit, delete, history) | ✅ Done |
| 6 | Presence + typing indicators | ✅ Done |
| 7 | Read receipts | ✅ Done |
| 8 | Threads | ✅ Done |
| 9 | Reactions | ✅ Done |
| 10 | File & media uploads (R2) | ✅ Done |
| 11 | Direct messages | ✅ Done |
| 12 | Search | ✅ Done |
| 13 | Notifications | ✅ Done |
| 14 | Chat monitoring / E2E encryption toggle | ✅ Done |
| 15 | Public landing page | ✅ Done |
| 16 | Admin panel | ✅ Done |
| 17 | npm package extraction | ✅ Done |

---

## DB conventions

- All IDs: UUID generated by PostgreSQL (`gen_random_uuid()`)
- All timestamps: UTC
- Column names: double-quoted camelCase (e.g. `"channelId"`, `"createdAt"`)
- Soft deletes on `Message` via `deletedAt` timestamp — never hard-delete messages
- IDs generated by the database, not by the application layer

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
- `proxy.ts` fetches `/api/auth/get-session` via HTTP (edge-safe)
- `lib/session.ts` is **server-only** — never import in Client Components
- `lib/db.ts` exports both `pool` (pg.Pool) and `db` (Kysely) — `db` is used only by the Better Auth adapter
- Socket.IO client singleton in `lib/socket.ts` should be lazy-initialized (connect only after auth)
- Presence state lives in Redis only — never persisted to PostgreSQL
- `store/presence.ts` is populated exclusively by `presence:update` socket events; `status` can be `'online'`, `'away'`, or `'offline'`
- `PresenceIndicator` maps status → color: green = online, yellow = away, gray = offline
- Away detection in `ChatShell`: tab hidden via `visibilitychange` triggers immediate away; 5 min of no `mousemove/keydown/pointerdown/scroll` also triggers away; returning to tab or any activity emits `presence:back`
- `CLIENT_EVENTS.PRESENCE_AWAY` / `PRESENCE_BACK` added to `@pulse-chat/shared` events — server handlers live in `server/socket/events/presence.ts`
- `server/dal/presence.ts` `setAway()` updates Redis key in place (preserves TTL via `KEEPTTL`) without touching channel membership sets
- **Message ordering fix**: In `MessageList.onMessageReceive`, new socket messages must be inserted into `pages[0]` (most recent page), NOT `pages[pages.length - 1]`. The infinite query stores pages newest-first; inserting into the last page puts new messages at the top of the chat when multiple pages are loaded.
- **ReactionPicker fix**: The `PopoverTrigger` + `Tooltip` composition uses `render`-as-element chaining (`TooltipTrigger render={<PopoverTrigger render={<Button>} />}`). Never use nested `render`-as-function inside a trigger — it creates a `ref` conflict where `tooltipTriggerProps.ref` overwrites `triggerProps.ref`, breaking the popover anchor.
- Virtualized list (`@tanstack/react-virtual`) is required for channels with >100 messages to prevent DOM bloat
- File uploads go client → S3 directly (presigned URL) — the app server never streams file bytes
- Shadcn components are in `components/ui/`
- `next.config.ts` enables `reactCompiler: true` and `authInterrupts: true`
- `@pulse-chat/shared` is the canonical source for all domain types, Zod schemas, and Socket.IO event constants — never redefine these inline in the frontend or server

---

## Module 14 — Chat Monitoring / E2E Encryption Toggle

### Overview
Each channel (and DM) can operate in one of two modes:
- **Monitored** — messages stored in plaintext; admins can read all messages for QA purposes. A persistent, always-visible badge is shown to all participants.
- **E2E Encrypted** — messages are encrypted client-side before transmission; the server stores ciphertext only. Admins cannot read message content.

Users must always be informed which mode is active. The monitoring badge is **non-dismissible**.

---

### DB changes

```sql
CREATE TYPE "ChannelMode" AS ENUM ('MONITORED', 'E2E_ENCRYPTED');

ALTER TABLE "channel"
  ADD COLUMN "mode"          "ChannelMode" NOT NULL DEFAULT 'MONITORED',
  ADD COLUMN "modeChangedAt" TIMESTAMPTZ,
  ADD COLUMN "modeChangedBy" UUID REFERENCES "user"("id") ON DELETE SET NULL;
```

---

### Admin controls
- Admin can toggle any **public or private** channel between `MONITORED` ↔ `E2E_ENCRYPTED` from the channel settings or the admin panel.
- **Direct messages** are always `E2E_ENCRYPTED` — admins cannot override this.
- Mode change is logged as a system message in the channel: _"This conversation is now end-to-end encrypted."_ / _"This conversation is now monitored."_
- Mode change emits `channel:mode-changed` socket event so all connected clients update in real time.

---

### Monitoring badge (`components/shared/MonitoringBadge.tsx`)
- Renders in the top-right corner of every chat view.
- **Monitored mode**: amber badge — `"Monitored — messages may be reviewed"` with a shield icon.
- **E2E mode**: green badge — `"End-to-end encrypted"` with a lock icon.
- Badge is always visible; it cannot be hidden or dismissed by the user.
- Driven by `channel.mode` from the channel query — no extra API call needed.

---

### E2E encryption design (to be detailed during implementation)
- Key exchange: X25519 (ECDH) — each user generates a keypair on first login; public key stored in DB, private key stored only in client (localStorage / IndexedDB).
- Symmetric encryption: AES-GCM 256-bit per message.
- Group channels in E2E mode use a shared channel key encrypted per-member with their public key (similar to Signal's sender keys).
- Server never sees plaintext; search (module 12) is disabled for E2E channels.
- If a user loses their private key they lose access to past messages — no key escrow.

---

### New socket event

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `channel:mode-changed` | Server → Clients | `{ channelId, mode, changedBy, changedAt }` | Notify all members when monitoring mode changes |

---

### New API route

| URL | File | Notes |
|---|---|---|
| `PATCH /api/channels/[id]/mode` | `app/api/channels/[id]/mode/route.ts` | Admin only — toggle channel mode |

---

### New component directories

| Directory | Contents |
|---|---|
| `components/shared/MonitoringBadge.tsx` | Always-visible mode indicator shown in every chat view |

---

## Module 17 — npm package extraction

### Overview
Shared code extracted into a private workspace package `@pulse-chat/shared` (`packages/shared/`).
Both the Next.js frontend and the Socket.IO server depend on it via `"workspace:*"`.

### Package contents (`packages/shared/src/`)

| File | Exports |
|---|---|
| `types.ts` | Domain types: `Channel`, `Message`, `Attachment`, `AttachmentInput`, `Member`, `AppNotification`, `ReadReceiptUser`, `PresencePayload`, and their enum union types |
| `schemas.ts` | Zod schemas: `SignInSchema`, `SignUpSchema`, `ChannelCreateSchema`, `MessageSchema` + inferred input types |
| `events.ts` | `CLIENT_EVENTS` / `SERVER_EVENTS` constants, `ClientEvent` / `ServerEvent` union types, and all socket payload types (`MessageNewPayload`, `TypingPayload`, `ReactionAddPayload`, etc.) |
| `index.ts` | Re-exports everything from the above three files |

### Workspace wiring
- `pnpm-workspace.yaml` — added `packages/*`
- `package.json` (root) — `"@pulse-chat/shared": "workspace:*"`
- `server/package.json` — `"@pulse-chat/shared": "workspace:*"`
- `tsconfig.json` (root) — path alias `"@pulse-chat/shared": ["packages/shared/src/index.ts"]`
- `server/tsconfig.json` — path alias `"@pulse-chat/shared": ["../packages/shared/src/index.ts"]`

### Re-export shims (preserve existing `@/` import paths)
- `types/db.ts` — re-exports all domain types from `@pulse-chat/shared`
- `schemas/index.ts` — re-exports all schemas and input types from `@pulse-chat/shared`

### Server event files updated
Inline `interface` definitions removed; types imported from `@pulse-chat/shared`:
- `server/socket/events/messages.ts` — `MessageNewPayload`, `MessageEditPayload`, `MessageDeletePayload`, `MessageReadPayload`
- `server/socket/events/channels.ts` — `ChannelJoinPayload`, `ChannelLeavePayload`
- `server/socket/events/reactions.ts` — `ReactionAddPayload`, `ReactionRemovePayload`
- `server/socket/events/threads.ts` — `ThreadReplyPayload`, `ThreadSubscribePayload`
- `server/socket/events/typing.ts` — `TypingPayload`
