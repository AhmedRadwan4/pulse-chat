import type {
  MessageDeletePayload,
  MessageEditPayload,
  MessageNewPayload,
  MessageReadPayload
} from '@pulse-chat/shared'
import { Server, Socket } from 'socket.io'
import { getMemberRole, isMember } from '../../dal/channels'
import { createMessage, deleteMessage, editMessage, getMessageById } from '../../dal/messages'
import { createNotification } from '../../dal/notifications'
import { pool } from '../../db'
import { enforceRateLimit } from '../../middleware/rateLimit'

const MAX_CONTENT_LENGTH = 4000
const MIN_CONTENT_LENGTH = 1
const MENTION_PATTERN = /@(\w+)/g

interface Actor {
  id: string
  name: string
  image: string | null
}

function buildNotifPayload(
  notif: {
    id: string
    type: string
    actorId: string
    channelId: string | null
    messageId: string | null
    body: string | null
    createdAt: Date
  },
  actor: Actor
) {
  return {
    id: notif.id,
    type: notif.type,
    actorId: notif.actorId,
    actorName: actor.name,
    actorImage: actor.image,
    channelId: notif.channelId,
    messageId: notif.messageId,
    body: notif.body,
    read: false,
    createdAt: notif.createdAt.toISOString()
  }
}

async function processNotifications(
  message: { id: string; channelId: string; content: string | null },
  actor: Actor,
  io: Server
) {
  try {
    const content = message.content ?? ''
    const { channelId } = message

    // 1. @mention detection
    const handles = [...content.matchAll(new RegExp(MENTION_PATTERN.source, 'g'))].map(m => m[1])
    if (handles.length > 0) {
      const { rows: mentioned } = await pool.query(
        `SELECT u."id" FROM "user" u
         JOIN "channel_member" cm ON cm."userId" = u."id" AND cm."channelId" = $1
         WHERE LOWER(u."username") = ANY($2::text[])
           AND u."id" != $3`,
        [channelId, handles.map(h => h.toLowerCase()), actor.id]
      )
      for (const target of mentioned) {
        const notif = await createNotification({
          userId: target.id,
          type: 'MENTION',
          actorId: actor.id,
          messageId: message.id,
          channelId,
          body: content.slice(0, 200)
        })
        io.to(`user:${target.id}`).emit('notification:new', buildNotifPayload(notif, actor))
      }
    }

    // 2. DM notification
    const { rows: channelRows } = await pool.query(
      `SELECT c."type",
        COALESCE(json_agg(json_build_object('userId', cm."userId")), '[]') AS members
       FROM "channel" c
       JOIN "channel_member" cm ON cm."channelId" = c."id"
       WHERE c."id" = $1
       GROUP BY c."id"`,
      [channelId]
    )
    const channel = channelRows[0]
    if (channel?.type === 'DIRECT') {
      const recipientId = channel.members.find((m: { userId: string }) => m.userId !== actor.id)?.userId
      if (recipientId) {
        const notif = await createNotification({
          userId: recipientId,
          type: 'DIRECT_MESSAGE',
          actorId: actor.id,
          messageId: message.id,
          channelId,
          body: content.slice(0, 200)
        })
        io.to(`user:${recipientId}`).emit('notification:new', buildNotifPayload(notif, actor))
      }
    }
  } catch (err) {
    console.error('[notifications] processNotifications error:', err)
  }
}

export function registerMessageHandlers(socket: Socket, io: Server) {
  const user = socket.data.user

  socket.on('message:new', async (payload: MessageNewPayload) => {
    try {
      const { channelId, content, attachments, threadId } = payload

      if (!channelId) {
        socket.emit('error', { event: 'message:new', message: 'Invalid payload' })
        return
      }

      const trimmed = (content ?? '').trim()
      const hasAttachments = Array.isArray(attachments) && attachments.length > 0

      if (!hasAttachments && trimmed.length < MIN_CONTENT_LENGTH) {
        socket.emit('error', { event: 'message:new', message: 'Message cannot be empty' })
        return
      }
      if (trimmed.length > MAX_CONTENT_LENGTH) {
        socket.emit('error', {
          event: 'message:new',
          message: `Content must be at most ${MAX_CONTENT_LENGTH} characters`
        })
        return
      }

      // Rate limit: 10 messages per 10 seconds
      try {
        await enforceRateLimit(user.id, 'message:new', 10, 10_000)
      } catch {
        socket.emit('error', { event: 'message:new', message: 'Rate limit exceeded. Slow down.' })
        return
      }

      // Verify channel membership
      const memberCheck = await isMember(channelId, user.id)
      if (!memberCheck) {
        socket.emit('error', { event: 'message:new', message: 'You are not a member of this channel' })
        return
      }

      const message = await createMessage({
        channelId,
        senderId: user.id,
        content: trimmed || undefined,
        threadId,
        attachments
      })

      // Broadcast to channel room (including sender)
      io.to(`channel:${channelId}`).emit('message:receive', message)

      // If in a thread, also broadcast to thread room
      if (threadId) {
        io.to(`thread:${threadId}`).emit('thread:receive', message)
      }

      // Fire-and-forget: mentions + DM notifications
      void processNotifications(
        { id: message.id, channelId, content: trimmed },
        { id: user.id, name: user.name, image: user.image ?? null },
        io
      )
    } catch (err) {
      console.error('[message:new] Error:', err)
      socket.emit('error', { event: 'message:new', message: 'Failed to send message' })
    }
  })

  socket.on('message:edit', async (payload: MessageEditPayload) => {
    try {
      const { messageId, content } = payload

      if (!messageId || typeof content !== 'string') {
        socket.emit('error', { event: 'message:edit', message: 'Invalid payload' })
        return
      }

      const trimmed = content.trim()
      if (trimmed.length < MIN_CONTENT_LENGTH || trimmed.length > MAX_CONTENT_LENGTH) {
        socket.emit('error', {
          event: 'message:edit',
          message: `Content must be between ${MIN_CONTENT_LENGTH} and ${MAX_CONTENT_LENGTH} characters`
        })
        return
      }

      // Verify ownership
      const existing = await getMessageById(messageId)
      if (!existing) {
        socket.emit('error', { event: 'message:edit', message: 'Message not found' })
        return
      }

      if (existing.senderId !== user.id) {
        socket.emit('error', { event: 'message:edit', message: 'You can only edit your own messages' })
        return
      }

      if (existing.deletedAt) {
        socket.emit('error', { event: 'message:edit', message: 'Cannot edit a deleted message' })
        return
      }

      const updated = await editMessage(messageId, trimmed)

      io.to(`channel:${existing.channelId}`).emit('message:edited', {
        messageId: updated.id,
        content: updated.content,
        editedAt: updated.editedAt
      })

      if (existing.threadId) {
        io.to(`thread:${existing.threadId}`).emit('message:edited', {
          messageId: updated.id,
          content: updated.content,
          editedAt: updated.editedAt
        })
      }
    } catch (err) {
      console.error('[message:edit] Error:', err)
      socket.emit('error', { event: 'message:edit', message: 'Failed to edit message' })
    }
  })

  socket.on('message:delete', async (payload: MessageDeletePayload) => {
    try {
      const { messageId } = payload

      if (!messageId) {
        socket.emit('error', { event: 'message:delete', message: 'Invalid payload' })
        return
      }

      const existing = await getMessageById(messageId)
      if (!existing) {
        socket.emit('error', { event: 'message:delete', message: 'Message not found' })
        return
      }

      if (existing.deletedAt) {
        socket.emit('error', { event: 'message:delete', message: 'Message already deleted' })
        return
      }

      const isOwner = existing.senderId === user.id
      if (!isOwner) {
        const memberRole = await getMemberRole(existing.channelId, user.id)
        const canModerate = memberRole === 'OWNER' || memberRole === 'ADMIN' || user.role === 'admin'
        if (!canModerate) {
          socket.emit('error', {
            event: 'message:delete',
            message: 'You do not have permission to delete this message'
          })
          return
        }
      }

      await deleteMessage(messageId)

      io.to(`channel:${existing.channelId}`).emit('message:deleted', { messageId })

      if (existing.threadId) {
        io.to(`thread:${existing.threadId}`).emit('message:deleted', { messageId })
      }
    } catch (err) {
      console.error('[message:delete] Error:', err)
      socket.emit('error', { event: 'message:delete', message: 'Failed to delete message' })
    }
  })

  socket.on('message:read', async (payload: MessageReadPayload) => {
    try {
      const { messageId, channelId } = payload

      if (!messageId || !channelId) {
        socket.emit('error', { event: 'message:read', message: 'Invalid payload' })
        return
      }

      const memberCheck = await isMember(channelId, user.id)
      if (!memberCheck) {
        socket.emit('error', { event: 'message:read', message: 'You are not a member of this channel' })
        return
      }

      await pool.query(
        `INSERT INTO "read_receipt" ("messageId", "userId", "readAt")
         VALUES ($1, $2, NOW())
         ON CONFLICT ("messageId", "userId") DO UPDATE SET "readAt" = NOW()`,
        [messageId, user.id]
      )

      io.to(`channel:${channelId}`).emit('read:update', {
        messageId,
        channelId,
        userId: user.id,
        userName: user.name,
        userImage: user.image ?? null,
        readAt: new Date().toISOString()
      })
    } catch (err) {
      console.error('[message:read] Error:', err)
    }
  })
}
