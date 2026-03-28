import { pool } from '../db'

type NotificationType = 'MENTION' | 'DIRECT_MESSAGE' | 'THREAD_REPLY'

export async function createNotification(data: {
  userId: string
  type: NotificationType
  actorId: string
  messageId?: string
  channelId?: string
  body?: string
}) {
  const {
    rows: [notif]
  } = await pool.query(
    `INSERT INTO "notification" ("userId", "type", "actorId", "messageId", "channelId", "body")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.userId, data.type, data.actorId, data.messageId ?? null, data.channelId ?? null, data.body ?? null]
  )
  return notif
}
