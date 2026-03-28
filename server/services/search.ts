import { pool } from '../db'

interface SearchResult {
  id: string
  channelId: string
  senderId: string
  content: string | null
  editedAt: Date | null
  deletedAt: Date | null
  createdAt: Date
  sender: {
    id: string
    name: string
    username: string | null
    image: string | null
  }
}

export async function searchMessages(
  query: string,
  channelId?: string,
  userId?: string,
  limit = 20
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) return []

  const sanitized = query
    .trim()
    .replace(/[&|!():*\\<>'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!sanitized) return []

  const params: any[] = [sanitized, limit]
  let channelFilter = ''

  if (channelId) {
    params.push(channelId)
    channelFilter = `AND m."channelId" = $3`
  } else if (userId) {
    params.push(userId)
    channelFilter = `
      AND EXISTS (
        SELECT 1 FROM "channel_member" cm
        WHERE cm."channelId" = m."channelId" AND cm."userId" = $3
      )`
  }

  const { rows } = await pool.query<SearchResult>(
    `SELECT
      m."id",
      m."channelId",
      m."senderId",
      m."content",
      m."editedAt",
      m."deletedAt",
      m."createdAt",
      json_build_object(
        'id', u."id",
        'name', u."name",
        'username', u."username",
        'image', u."image"
      ) AS "sender"
     FROM "message" m
     JOIN "user" u ON u."id" = m."senderId"
     WHERE m."deletedAt" IS NULL
       ${channelFilter}
       AND to_tsvector('english', COALESCE(m."content", '')) @@ plainto_tsquery('english', $1)
     ORDER BY
       ts_rank(to_tsvector('english', COALESCE(m."content", '')), plainto_tsquery('english', $1)) DESC,
       m."createdAt" DESC
     LIMIT $2`,
    params
  )

  return rows
}
