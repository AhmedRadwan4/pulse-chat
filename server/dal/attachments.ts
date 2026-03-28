import { pool } from '../db'

export async function createAttachment(data: {
  messageId: string
  url: string
  type: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO'
  name: string
  size: number
}) {
  const {
    rows: [attachment]
  } = await pool.query(
    `INSERT INTO "attachment" ("messageId", "url", "type", "name", "size")
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.messageId, data.url, data.type, data.name, data.size]
  )
  return attachment
}

export async function getAttachments(messageId: string) {
  const { rows } = await pool.query(`SELECT * FROM "attachment" WHERE "messageId" = $1 ORDER BY "createdAt" ASC`, [
    messageId
  ])
  return rows
}
