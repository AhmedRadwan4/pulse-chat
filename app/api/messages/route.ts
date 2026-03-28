import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { requireAuth } from '@/lib/session'

function groupReactions(reactions: { id: string; emoji: string; userId: string }[]) {
  const map = new Map<string, { emoji: string; count: number; userIds: string[] }>()
  for (const r of reactions) {
    const entry = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, userIds: [] }
    entry.count++
    entry.userIds.push(r.userId)
    map.set(r.emoji, entry)
  }
  return Array.from(map.values())
}

// GET /api/messages?channelId=&cursor=&limit=50
export async function GET(request: NextRequest) {
  const user = await requireAuth()
  const { searchParams } = request.nextUrl

  const channelId = searchParams.get('channelId')
  if (!channelId) return NextResponse.json({ error: 'channelId required' }, { status: 400 })

  const cursor = searchParams.get('cursor') ?? undefined
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100)

  const {
    rows: [membership]
  } = await pool.query(`SELECT 1 FROM "channel_member" WHERE "channelId" = $1 AND "userId" = $2 LIMIT 1`, [
    channelId,
    user.id
  ])
  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

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

  const { rows: messages } = await pool.query(
    `SELECT
      m."id", m."channelId", m."senderId", m."content", m."threadId",
      m."editedAt", m."deletedAt", m."createdAt",
      json_build_object('id', u."id", 'name', u."name", 'username', u."username", 'image', u."image") AS "sender",
      COALESCE(
        json_agg(DISTINCT jsonb_build_object('id', a."id", 'url', a."url", 'type', a."type", 'name', a."name", 'size', a."size", 'createdAt', a."createdAt"))
        FILTER (WHERE a."id" IS NOT NULL), '[]'::json
      ) AS "attachments",
      COALESCE(
        json_agg(DISTINCT jsonb_build_object('id', r."id", 'emoji', r."emoji", 'userId', r."userId"))
        FILTER (WHERE r."id" IS NOT NULL), '[]'::json
      ) AS "reactions"
     FROM "message" m
     JOIN "user" u ON u."id" = m."senderId"
     LEFT JOIN "attachment" a ON a."messageId" = m."id"
     LEFT JOIN "reaction" r ON r."messageId" = m."id"
     WHERE m."channelId" = $1
       AND m."deletedAt" IS NULL
       AND m."threadId" IS NULL
       ${cursorClause}
     GROUP BY m."id", u."id"
     ORDER BY m."createdAt" DESC, m."id" DESC
     LIMIT $2`,
    params
  )

  const hasMore = messages.length > limit
  const page = hasMore ? messages.slice(0, limit) : messages
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

  const formatted = page.reverse().map(m => ({
    ...m,
    reactions: groupReactions(m.reactions as { id: string; emoji: string; userId: string }[])
  }))

  return NextResponse.json({ messages: formatted, nextCursor })
}
