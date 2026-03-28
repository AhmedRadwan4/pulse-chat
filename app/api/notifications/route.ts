import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { requireAuth } from '@/lib/session'

// GET /api/notifications?limit=20&cursor=<id>
export async function GET(request: NextRequest) {
  const user = await requireAuth()
  const { searchParams } = request.nextUrl
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50)
  const cursor = searchParams.get('cursor') ?? undefined

  const params: any[] = [user.id, limit + 1]
  let cursorClause = ''
  if (cursor) {
    params.push(cursor)
    cursorClause = `
      AND n."createdAt" < (SELECT "createdAt" FROM "notification" WHERE "id" = $3)`
  }

  const [
    { rows: raw },
    {
      rows: [countRow]
    }
  ] = await Promise.all([
    pool.query(
      `SELECT
        n."id", n."type", n."read", n."actorId", n."messageId", n."channelId", n."body", n."createdAt",
        json_build_object('id', u."id", 'name', u."name", 'image', u."image") AS "actor"
       FROM "notification" n
       JOIN "user" u ON u."id" = n."actorId"
       WHERE n."userId" = $1 ${cursorClause}
       ORDER BY n."createdAt" DESC
       LIMIT $2`,
      params
    ),
    pool.query(`SELECT COUNT(*)::int AS "count" FROM "notification" WHERE "userId" = $1 AND "read" = false`, [user.id])
  ])

  const hasMore = raw.length > limit
  if (hasMore) raw.pop()

  const notifications = raw.map(n => ({
    id: n.id,
    type: n.type,
    actorId: n.actorId,
    actorName: n.actor.name,
    actorImage: n.actor.image ?? null,
    channelId: n.channelId ?? null,
    messageId: n.messageId ?? null,
    body: n.body ?? null,
    read: n.read,
    createdAt: new Date(n.createdAt).toISOString()
  }))

  return NextResponse.json({
    notifications,
    unreadCount: countRow.count,
    nextCursor: hasMore ? notifications[notifications.length - 1].id : null
  })
}
