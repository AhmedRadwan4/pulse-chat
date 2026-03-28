import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { requireAuth } from '@/lib/session'

// GET /api/search?q=&channelId=&limit=20
export async function GET(request: NextRequest) {
  const user = await requireAuth()
  const { searchParams } = request.nextUrl

  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  const channelId = searchParams.get('channelId') ?? undefined
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50)

  // Sanitize query for tsvector
  const sanitized = q
    .replace(/[&|!():*\\<>'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!sanitized) return NextResponse.json({ messages: [] })

  const params: any[] = [sanitized, limit]
  let channelFilter = ''

  if (channelId) {
    params.push(channelId, user.id)
    channelFilter = `
      AND m."channelId" = $3
      AND EXISTS (SELECT 1 FROM "channel_member" WHERE "channelId" = $3 AND "userId" = $4)`
  } else {
    params.push(user.id)
    channelFilter = `
      AND EXISTS (
        SELECT 1 FROM "channel_member" WHERE "channelId" = m."channelId" AND "userId" = $3
      )`
  }

  const { rows: messages } = await pool.query(
    `SELECT
      m."id", m."channelId", m."senderId", m."content", m."editedAt", m."deletedAt", m."createdAt",
      json_build_object('id', u."id", 'name', u."name", 'username', u."username", 'image', u."image") AS "sender",
      json_build_object('id', c."id", 'name', c."name", 'type', c."type") AS "channel"
     FROM "message" m
     JOIN "user" u ON u."id" = m."senderId"
     JOIN "channel" c ON c."id" = m."channelId"
     WHERE m."deletedAt" IS NULL
       ${channelFilter}
       AND to_tsvector('english', COALESCE(m."content", '')) @@ plainto_tsquery('english', $1)
     ORDER BY
       ts_rank(to_tsvector('english', COALESCE(m."content", '')), plainto_tsquery('english', $1)) DESC,
       m."createdAt" DESC
     LIMIT $2`,
    params
  )

  return NextResponse.json({ messages })
}
