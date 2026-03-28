import { pool } from '../db'

const MESSAGE_COLS = `
  m."id",
  m."channelId",
  m."senderId",
  m."content",
  m."threadId",
  m."editedAt",
  m."deletedAt",
  m."createdAt",
  json_build_object(
    'id', u."id",
    'name', u."name",
    'username', u."username",
    'image', u."image"
  ) AS "sender",
  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'id', a."id",
      'url', a."url",
      'type', a."type",
      'name', a."name",
      'size', a."size",
      'createdAt', a."createdAt"
    )) FILTER (WHERE a."id" IS NOT NULL),
    '[]'::json
  ) AS "attachments",
  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'id', r."id",
      'emoji', r."emoji",
      'userId', r."userId"
    )) FILTER (WHERE r."id" IS NOT NULL),
    '[]'::json
  ) AS "reactions"
`

const MESSAGE_JOINS = `
  JOIN "user" u ON u."id" = m."senderId"
  LEFT JOIN "attachment" a ON a."messageId" = m."id"
  LEFT JOIN "reaction" r ON r."messageId" = m."id"
`

export async function createMessage(data: {
  channelId: string
  senderId: string
  content?: string
  threadId?: string
  attachments?: Array<{
    url: string
    type: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO'
    name: string
    size: number
  }>
}) {
  const { attachments, channelId, senderId, content, threadId } = data
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const {
      rows: [msg]
    } = await client.query(
      `INSERT INTO "message" ("channelId", "senderId", "content", "threadId")
       VALUES ($1, $2, $3, $4)
       RETURNING "id"`,
      [channelId, senderId, content ?? null, threadId ?? null]
    )
    if (attachments?.length) {
      const params2: any[] = []
      const vals2 = attachments.map((a, i) => {
        const base = i * 5
        params2.push(msg.id, a.url, a.type, a.name, a.size)
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`
      })
      await client.query(
        `INSERT INTO "attachment" ("messageId", "url", "type", "name", "size") VALUES ${vals2.join(', ')}`,
        params2
      )
    }
    await client.query('COMMIT')

    const { rows } = await pool.query(
      `SELECT ${MESSAGE_COLS}
       FROM "message" m
       ${MESSAGE_JOINS}
       WHERE m."id" = $1
       GROUP BY m."id", u."id"`,
      [msg.id]
    )
    return rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getMessages(channelId: string, cursor?: string, limit = 50) {
  const params: any[] = [channelId, limit + 1]
  let cursorClause = ''
  if (cursor) {
    params.push(cursor)
    cursorClause = `
      AND (
        m."createdAt" < (SELECT "createdAt" FROM "message" WHERE "id" = $3)
        OR (m."createdAt" = (SELECT "createdAt" FROM "message" WHERE "id" = $3) AND m."id" < $3)
      )`
  }

  const { rows } = await pool.query(
    `SELECT ${MESSAGE_COLS}
     FROM "message" m
     ${MESSAGE_JOINS}
     WHERE m."channelId" = $1
       AND m."deletedAt" IS NULL
       AND m."threadId" IS NULL
       ${cursorClause}
     GROUP BY m."id", u."id"
     ORDER BY m."createdAt" DESC, m."id" DESC
     LIMIT $2`,
    params
  )
  return rows
}

export async function editMessage(messageId: string, content: string) {
  const { rows } = await pool.query(
    `UPDATE "message" SET "content" = $1, "editedAt" = NOW() WHERE "id" = $2 RETURNING "id", "content", "editedAt", "channelId", "threadId"`,
    [content, messageId]
  )
  return rows[0]
}

export async function deleteMessage(messageId: string) {
  const { rows } = await pool.query(
    `UPDATE "message" SET "deletedAt" = NOW(), "content" = NULL WHERE "id" = $1 RETURNING "id"`,
    [messageId]
  )
  return rows[0]
}

export async function getMessageById(messageId: string) {
  const { rows } = await pool.query(
    `SELECT ${MESSAGE_COLS}
     FROM "message" m
     ${MESSAGE_JOINS}
     WHERE m."id" = $1
     GROUP BY m."id", u."id"`,
    [messageId]
  )
  return rows[0] ?? null
}
