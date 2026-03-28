import type { ReactionAddPayload, ReactionRemovePayload } from '@pulse-chat/shared'
import { Server, Socket } from 'socket.io'
import { isMember } from '../../dal/channels'
import { getMessageById } from '../../dal/messages'
import { addReaction, getReactions, removeReaction } from '../../dal/reactions'

export function registerReactionHandlers(socket: Socket, io: Server) {
  const user = socket.data.user

  socket.on('reaction:add', async (payload: ReactionAddPayload) => {
    try {
      const { messageId, emoji } = payload

      if (!messageId || !emoji || typeof emoji !== 'string') {
        socket.emit('error', { event: 'reaction:add', message: 'Invalid payload' })
        return
      }

      if (emoji.length > 10) {
        socket.emit('error', { event: 'reaction:add', message: 'Invalid emoji' })
        return
      }

      const message = await getMessageById(messageId)
      if (!message) {
        socket.emit('error', { event: 'reaction:add', message: 'Message not found' })
        return
      }

      if (message.deletedAt) {
        socket.emit('error', { event: 'reaction:add', message: 'Cannot react to a deleted message' })
        return
      }

      // Verify channel membership
      const memberCheck = await isMember(message.channelId, user.id)
      if (!memberCheck) {
        socket.emit('error', { event: 'reaction:add', message: 'You are not a member of this channel' })
        return
      }

      await addReaction(messageId, user.id, emoji)
      const reactions = await getReactions(messageId)

      io.to(`channel:${message.channelId}`).emit('reaction:update', {
        messageId,
        channelId: message.channelId,
        reactions
      })
    } catch (err) {
      console.error('[reaction:add] Error:', err)
      socket.emit('error', { event: 'reaction:add', message: 'Failed to add reaction' })
    }
  })

  socket.on('reaction:remove', async (payload: ReactionRemovePayload) => {
    try {
      const { messageId, emoji } = payload

      if (!messageId || !emoji) {
        socket.emit('error', { event: 'reaction:remove', message: 'Invalid payload' })
        return
      }

      const message = await getMessageById(messageId)
      if (!message) {
        socket.emit('error', { event: 'reaction:remove', message: 'Message not found' })
        return
      }

      // Verify channel membership
      const memberCheck = await isMember(message.channelId, user.id)
      if (!memberCheck) {
        socket.emit('error', { event: 'reaction:remove', message: 'You are not a member of this channel' })
        return
      }

      await removeReaction(messageId, user.id, emoji)
      const reactions = await getReactions(messageId)

      io.to(`channel:${message.channelId}`).emit('reaction:update', {
        messageId,
        channelId: message.channelId,
        reactions
      })
    } catch (err) {
      console.error('[reaction:remove] Error:', err)
      socket.emit('error', { event: 'reaction:remove', message: 'Failed to remove reaction' })
    }
  })
}
