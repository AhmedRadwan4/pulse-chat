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
      'id', a."id", 'url', a."url", 'type', a."type", 'name', a."name", 'size', a."size", 'createdAt', a."createdAt"
    )) FILTER (WHERE a."id" IS NOT NULL),
    '[]'::json
  ) AS "attachments",
  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'id', r."id", 'emoji', r."emoji", 'userId', r."userId"
    )) FILTER (WHERE r."id" IS NOT NULL),
    '[]'::json
  ) AS "reactions"
`

const MESSAGE_JOINS = `
  JOIN "user" u ON u."id" = m."senderId"
  LEFT JOIN "attachment" a ON a."messageId" = m."id"
  LEFT JOIN "reaction" r ON r."messageId" = m."id"
`

export async function createThread(parentMessageId: string, channelId: string) {
  const {
    rows: [thread]
  } = await pool.query(`INSERT INTO "thread" ("parentMessageId", "channelId") VALUES ($1, $2) RETURNING *`, [
    parentMessageId,
    channelId
  ])
  return thread
}

export async function getOrCreateThread(parentMessageId: string, channelId: string) {
  const { rows } = await pool.query(`SELECT * FROM "thread" WHERE "parentMessageId" = $1 LIMIT 1`, [parentMessageId])
  if (rows[0]) return rows[0]
  return createThread(parentMessageId, channelId)
}

export async function getThreadMessages(threadId: string, cursor?: string, limit = 50) {
  const params: any[] = [threadId, limit + 1]
  let cursorClause = ''
  if (cursor) {
    params.push(cursor)
    cursorClause = `
      AND (
        m."createdAt" > (SELECT "createdAt" FROM "message" WHERE "id" = $3)
        OR (m."createdAt" = (SELECT "createdAt" FROM "message" WHERE "id" = $3) AND m."id" > $3)
      )`
  }

  const { rows } = await pool.query(
    `SELECT ${MESSAGE_COLS}
     FROM "message" m
     ${MESSAGE_JOINS}
     WHERE m."threadId" = $1
       AND m."deletedAt" IS NULL
       ${cursorClause}
     GROUP BY m."id", u."id"
     ORDER BY m."createdAt" ASC, m."id" ASC
     LIMIT $2`,
    params
  )
  return rows
}

export async function getThreadById(threadId: string) {
  const { rows } = await pool.query(`SELECT * FROM "thread" WHERE "id" = $1 LIMIT 1`, [threadId])
  return rows[0] ?? null
}
