import type { ChannelJoinPayload, ChannelLeavePayload } from '@pulse-chat/shared'
import { Server, Socket } from 'socket.io'
import { isMember } from '../../dal/channels'
import redis from '../../redis'

export function registerChannelHandlers(socket: Socket, io: Server) {
  const user = socket.data.user

  socket.on('channel:join', async (payload: ChannelJoinPayload) => {
    try {
      const { channelId } = payload
      if (!channelId) {
        socket.emit('error', { event: 'channel:join', message: 'Invalid payload' })
        return
      }

      // Verify the user is a member of this channel
      const memberCheck = await isMember(channelId, user.id)
      if (!memberCheck) {
        socket.emit('error', { event: 'channel:join', message: 'You are not a member of this channel' })
        return
      }

      // Join the socket room
      await socket.join(`channel:${channelId}`)

      // Add to Redis presence set for this channel
      await redis.sadd(`presence:channel:${channelId}`, user.id)

      socket.emit('channel:joined', { channelId })
    } catch (err) {
      console.error('[channel:join] Error:', err)
      socket.emit('error', { event: 'channel:join', message: 'Failed to join channel' })
    }
  })

  socket.on('channel:leave', async (payload: ChannelLeavePayload) => {
    try {
      const { channelId } = payload
      if (!channelId) {
        socket.emit('error', { event: 'channel:leave', message: 'Invalid payload' })
        return
      }

      // Leave the socket room
      await socket.leave(`channel:${channelId}`)

      // Remove from Redis presence set
      await redis.srem(`presence:channel:${channelId}`, user.id)

      socket.emit('channel:left', { channelId })
    } catch (err) {
      console.error('[channel:leave] Error:', err)
      socket.emit('error', { event: 'channel:leave', message: 'Failed to leave channel' })
    }
  })
}
