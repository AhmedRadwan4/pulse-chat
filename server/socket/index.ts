import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import { Server } from 'socket.io'
import { socketAuthMiddleware } from '../middleware/auth'
import { registerChannelHandlers } from './events/channels'
import { registerMessageHandlers } from './events/messages'
import { registerPresenceHandlers } from './events/presence'
import { registerReactionHandlers } from './events/reactions'
import { registerThreadHandlers } from './events/threads'
import { registerTypingHandlers } from './events/typing'

export function setupSocket(io: Server) {
  // Create dedicated pub/sub Redis clients for the Socket.IO adapter
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  const pubClient = new Redis(redisUrl)
  const subClient = pubClient.duplicate()

  // Subscribe to mode-change events published by the Next.js API
  const modeSub = new Redis(redisUrl)
  modeSub.subscribe('channel:mode-changed', err => {
    if (err) console.error('[Socket.IO] Failed to subscribe to channel:mode-changed:', err)
  })
  modeSub.on('message', (_channel, message) => {
    try {
      const data = JSON.parse(message)
      io.to(`channel:${data.channelId}`).emit('channel:mode-changed', data)
    } catch (err) {
      console.error('[Socket.IO] Failed to parse channel:mode-changed payload:', err)
    }
  })

  pubClient.on('error', err => {
    console.error('[Socket.IO Redis Adapter] pubClient error:', err)
  })
  subClient.on('error', err => {
    console.error('[Socket.IO Redis Adapter] subClient error:', err)
  })

  io.adapter(createAdapter(pubClient, subClient))

  // Auth middleware — runs before every connection
  io.use(socketAuthMiddleware)

  io.on('connection', async socket => {
    const user = socket.data.user
    console.log(`[Socket.IO] User connected: ${user.id} (${user.name}) — socket: ${socket.id}`)

    // Register presence (joins channel rooms, sets online in Redis, handles disconnect cleanup)
    await registerPresenceHandlers(socket, io)

    // Register domain event handlers
    registerMessageHandlers(socket, io)
    registerTypingHandlers(socket, io)
    registerChannelHandlers(socket, io)
    registerReactionHandlers(socket, io)
    registerThreadHandlers(socket, io)

    socket.on('error', err => {
      console.error(`[Socket.IO] Socket error for user ${user.id}:`, err)
    })
  })

  console.log('[Socket.IO] Setup complete')
}
