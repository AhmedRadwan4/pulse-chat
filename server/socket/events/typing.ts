import type { TypingPayload } from '@pulse-chat/shared'
import { Server, Socket } from 'socket.io'
import redis from '../../redis'

const TYPING_EXPIRY_SECONDS = 5

async function getTypingUsers(channelId: string): Promise<{ id: string; name: string }[]> {
  const hash = await redis.hgetall(`typing:${channelId}`)
  if (!hash) return []
  return Object.entries(hash).map(([id, name]) => ({ id, name }))
}

async function broadcastTypingUpdate(socket: Socket, io: Server, channelId: string) {
  const typingUsers = await getTypingUsers(channelId)
  // Broadcast to everyone in the channel room except the sender
  socket.to(`channel:${channelId}`).emit('typing:update', { channelId, typingUsers })
}

export function registerTypingHandlers(socket: Socket, io: Server) {
  const user = socket.data.user

  socket.on('typing:start', async (payload: TypingPayload) => {
    try {
      const { channelId } = payload
      if (!channelId) return

      // Store userId → displayName in a hash for enriched broadcasts
      // Per-user TTL key so stale typers are cleaned up
      const hashKey = `typing:${channelId}`
      const userKey = `typing:${channelId}:${user.id}`

      const pipeline = redis.pipeline()
      pipeline.hset(hashKey, user.id, user.name)
      pipeline.set(userKey, '1', 'EX', TYPING_EXPIRY_SECONDS)
      await pipeline.exec()

      await broadcastTypingUpdate(socket, io, channelId)
    } catch (err) {
      console.error('[typing:start] Error:', err)
    }
  })

  socket.on('typing:stop', async (payload: TypingPayload) => {
    try {
      const { channelId } = payload
      if (!channelId) return

      const pipeline = redis.pipeline()
      pipeline.hdel(`typing:${channelId}`, user.id)
      pipeline.del(`typing:${channelId}:${user.id}`)
      await pipeline.exec()

      await broadcastTypingUpdate(socket, io, channelId)
    } catch (err) {
      console.error('[typing:stop] Error:', err)
    }
  })
}

/**
 * Remove a user from all typing hashes when they disconnect.
 * Called from the presence handler on disconnect.
 */
export async function clearTypingForUser(userId: string, channelIds: string[]) {
  if (channelIds.length === 0) return
  const pipeline = redis.pipeline()
  for (const channelId of channelIds) {
    pipeline.hdel(`typing:${channelId}`, userId)
    pipeline.del(`typing:${channelId}:${userId}`)
  }
  await pipeline.exec()
}
