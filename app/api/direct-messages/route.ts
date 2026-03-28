import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { requireAuth } from '@/lib/session'

// GET /api/direct-messages — list all DM channels for the current user
export async function GET() {
  const user = await requireAuth()

  const { rows } = await pool.query(
    `SELECT
      c."id" AS "channelId",
      (
        SELECT json_build_object('id', u."id", 'name', u."name", 'username', u."username", 'image', u."image")
        FROM "channel_member" cm2
        JOIN "user" u ON u."id" = cm2."userId"
        WHERE cm2."channelId" = c."id" AND cm2."userId" != $1
        LIMIT 1
      ) AS "otherUser"
     FROM "channel_member" cm
     JOIN "channel" c ON c."id" = cm."channelId"
     WHERE cm."userId" = $1 AND c."type" = 'DIRECT'
     ORDER BY cm."joinedAt" ASC`,
    [user.id]
  )

  return NextResponse.json({ dms: rows })
}

// POST /api/direct-messages — get or create a DM channel with a user
export async function POST(request: NextRequest) {
  const user = await requireAuth()

  const body = await request.json()
  const targetUserId: string = body.userId

  if (!targetUserId || typeof targetUserId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }
  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'Cannot DM yourself' }, { status: 400 })
  }

  const {
    rows: [targetUser]
  } = await pool.query(`SELECT "id" FROM "user" WHERE "id" = $1 LIMIT 1`, [targetUserId])
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Find existing DIRECT channel between these two users
  const {
    rows: [existing]
  } = await pool.query(
    `SELECT c."id" FROM "channel" c
     WHERE c."type" = 'DIRECT'
       AND EXISTS (SELECT 1 FROM "channel_member" WHERE "channelId" = c."id" AND "userId" = $1)
       AND EXISTS (SELECT 1 FROM "channel_member" WHERE "channelId" = c."id" AND "userId" = $2)
     LIMIT 1`,
    [user.id, targetUserId]
  )

  if (existing) return NextResponse.json({ channelId: existing.id })

  // Create new DIRECT channel
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const {
      rows: [channel]
    } = await client.query(
      `INSERT INTO "channel" ("type", "createdById", "mode") VALUES ('DIRECT', $1, 'E2E_ENCRYPTED') RETURNING "id"`,
      [user.id]
    )
    await client.query(
      `INSERT INTO "channel_member" ("channelId", "userId", "role") VALUES ($1, $2, 'MEMBER'), ($1, $3, 'MEMBER')`,
      [channel.id, user.id, targetUserId]
    )
    await client.query('COMMIT')
    return NextResponse.json({ channelId: channel.id }, { status: 201 })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
