import type { ThreadReplyPayload, ThreadSubscribePayload } from '@pulse-chat/shared'
import { Server, Socket } from 'socket.io'
import { isMember } from '../../dal/channels'
import { createMessage } from '../../dal/messages'
import { createNotification } from '../../dal/notifications'
import { getThreadById } from '../../dal/threads'
import { pool } from '../../db'

async function processThreadNotification(
  message: { id: string; channelId: string; content: string | null },
  threadId: string,
  actor: { id: string; name: string; image: string | null },
  io: Server
) {
  try {
    const { rows: threadRows } = await pool.query(
      `SELECT m."senderId" AS "parentSenderId"
       FROM "thread" t
       JOIN "message" m ON m."id" = t."parentMessageId"
       WHERE t."id" = $1
       LIMIT 1`,
      [threadId]
    )
    const parentSenderId = threadRows[0]?.parentSenderId
    if (!parentSenderId || parentSenderId === actor.id) return

    const notif = await createNotification({
      userId: parentSenderId,
      type: 'THREAD_REPLY',
      actorId: actor.id,
      messageId: message.id,
      channelId: message.channelId,
      body: (message.content ?? '').slice(0, 200)
    })

    io.to(`user:${parentSenderId}`).emit('notification:new', {
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
    })
  } catch (err) {
    console.error('[notifications] processThreadNotification error:', err)
  }
}

export function registerThreadHandlers(socket: Socket, io: Server) {
  const user = socket.data.user

  socket.on('thread:reply', async (payload: ThreadReplyPayload) => {
    try {
      const { threadId, content, attachments } = payload

      if (!threadId || typeof content !== 'string') {
        socket.emit('error', { event: 'thread:reply', message: 'Invalid payload' })
        return
      }

      const trimmed = content.trim()
      if (trimmed.length < 1 || trimmed.length > 4000) {
        socket.emit('error', {
          event: 'thread:reply',
          message: 'Content must be between 1 and 4000 characters'
        })
        return
      }

      // Verify thread exists
      const thread = await getThreadById(threadId)
      if (!thread) {
        socket.emit('error', { event: 'thread:reply', message: 'Thread not found' })
        return
      }

      // Verify channel membership
      const memberCheck = await isMember(thread.channelId, user.id)
      if (!memberCheck) {
        socket.emit('error', { event: 'thread:reply', message: 'You are not a member of this channel' })
        return
      }

      const message = await createMessage({
        channelId: thread.channelId,
        senderId: user.id,
        content: trimmed,
        threadId,
        attachments
      })

      // Emit to thread room subscribers
      io.to(`thread:${threadId}`).emit('thread:receive', message)

      // Also emit to the channel room so channel view can update thread reply counts
      io.to(`channel:${thread.channelId}`).emit('message:receive', message)

      // Fire-and-forget: thread reply notification
      void processThreadNotification(
        { id: message.id, channelId: thread.channelId, content: trimmed },
        threadId,
        { id: user.id, name: user.name, image: user.image ?? null },
        io
      )
    } catch (err) {
      console.error('[thread:reply] Error:', err)
      socket.emit('error', { event: 'thread:reply', message: 'Failed to send thread reply' })
    }
  })

  socket.on('thread:subscribe', async (payload: ThreadSubscribePayload) => {
    try {
      const { threadId } = payload
      if (!threadId) {
        socket.emit('error', { event: 'thread:subscribe', message: 'Invalid payload' })
        return
      }

      const thread = await getThreadById(threadId)
      if (!thread) {
        socket.emit('error', { event: 'thread:subscribe', message: 'Thread not found' })
        return
      }

      const memberCheck = await isMember(thread.channelId, user.id)
      if (!memberCheck) {
        socket.emit('error', { event: 'thread:subscribe', message: 'You are not a member of this channel' })
        return
      }

      await socket.join(`thread:${threadId}`)
      socket.emit('thread:subscribed', { threadId })
    } catch (err) {
      console.error('[thread:subscribe] Error:', err)
      socket.emit('error', { event: 'thread:subscribe', message: 'Failed to subscribe to thread' })
    }
  })
}
