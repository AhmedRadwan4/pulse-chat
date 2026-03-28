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

const MSG_COLS = `
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
`

const MSG_JOINS = `
  JOIN "user" u ON u."id" = m."senderId"
  LEFT JOIN "attachment" a ON a."messageId" = m."id"
  LEFT JOIN "reaction" r ON r."messageId" = m."id"
`

// GET /api/threads/[id]
// [id] can be a Thread.id or a parent Message.id
// Creates the thread if it doesn't exist yet (first open)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  const { id } = await params

  const cursor = request.nextUrl.searchParams.get('cursor') ?? undefined
  const limit = 50

  // Try Thread.id first, then parentMessageId
  let {
    rows: [thread]
  } = await pool.query(`SELECT * FROM "thread" WHERE "id" = $1 LIMIT 1`, [id])

  if (!thread) {
    const res = await pool.query(`SELECT * FROM "thread" WHERE "parentMessageId" = $1 LIMIT 1`, [id])
    thread = res.rows[0]
  }

  if (!thread) {
    // Create thread on first open
    const {
      rows: [parentMsg]
    } = await pool.query(`SELECT "id", "channelId" FROM "message" WHERE "id" = $1 LIMIT 1`, [id])
    if (!parentMsg) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    const {
      rows: [membership]
    } = await pool.query(`SELECT 1 FROM "channel_member" WHERE "channelId" = $1 AND "userId" = $2 LIMIT 1`, [
      parentMsg.channelId,
      user.id
    ])
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

    const {
      rows: [newThread]
    } = await pool.query(`INSERT INTO "thread" ("parentMessageId", "channelId") VALUES ($1, $2) RETURNING *`, [
      id,
      parentMsg.channelId
    ])
    thread = newThread
  } else {
    const {
      rows: [membership]
    } = await pool.query(`SELECT 1 FROM "channel_member" WHERE "channelId" = $1 AND "userId" = $2 LIMIT 1`, [
      thread.channelId,
      user.id
    ])
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })
  }

  // Fetch parent message
  const {
    rows: [parentMessage]
  } = await pool.query(`SELECT ${MSG_COLS} FROM "message" m ${MSG_JOINS} WHERE m."id" = $1 GROUP BY m."id", u."id"`, [
    thread.parentMessageId
  ])

  // Fetch thread replies
  const replyParams: any[] = [thread.id, limit + 1]
  let cursorClause = ''
  if (cursor) {
    replyParams.push(cursor)
    cursorClause = `
      AND (
        m."createdAt" > (SELECT "createdAt" FROM "message" WHERE "id" = $3)
        OR (m."createdAt" = (SELECT "createdAt" FROM "message" WHERE "id" = $3) AND m."id" > $3)
      )`
  }

  const { rows: messages } = await pool.query(
    `SELECT ${MSG_COLS}
     FROM "message" m ${MSG_JOINS}
     WHERE m."threadId" = $1 AND m."deletedAt" IS NULL ${cursorClause}
     GROUP BY m."id", u."id"
     ORDER BY m."createdAt" ASC, m."id" ASC
     LIMIT $2`,
    replyParams
  )

  const hasMore = messages.length > limit
  const page = hasMore ? messages.slice(0, limit) : messages
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

  return NextResponse.json({
    thread,
    parentMessage: parentMessage ? { ...parentMessage, reactions: groupReactions(parentMessage.reactions) } : null,
    messages: page.map(m => ({ ...m, reactions: groupReactions(m.reactions) })),
    nextCursor
  })
}
