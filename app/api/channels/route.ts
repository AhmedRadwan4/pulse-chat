import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { requireAuth } from '@/lib/session'
import { ChannelCreateSchema } from '@/schemas'

// GET /api/channels — list channels the user is a member of
export async function GET() {
  const user = await requireAuth()

  const { rows } = await pool.query(
    `SELECT
      cm."role" AS "memberRole",
      c.*,
      (SELECT COUNT(*)::int FROM "channel_member" WHERE "channelId" = c."id") AS "memberCount",
      (SELECT COUNT(*)::int FROM "message" WHERE "channelId" = c."id") AS "messageCount"
     FROM "channel_member" cm
     JOIN "channel" c ON c."id" = cm."channelId"
     WHERE cm."userId" = $1
     ORDER BY cm."joinedAt" ASC`,
    [user.id]
  )

  return NextResponse.json({ channels: rows })
}

// POST /api/channels — create a new channel
export async function POST(request: NextRequest) {
  const user = await requireAuth()

  const body = await request.json()
  const parsed = ChannelCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { name, description, type } = parsed.data

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const {
      rows: [channel]
    } = await client.query(
      `INSERT INTO "channel" ("name", "description", "type", "createdById")
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description ?? null, type, user.id]
    )
    await client.query(`INSERT INTO "channel_member" ("channelId", "userId", "role") VALUES ($1, $2, 'OWNER')`, [
      channel.id,
      user.id
    ])
    await client.query('COMMIT')

    const memberCount = 1
    const messageCount = 0
    return NextResponse.json({ ...channel, memberCount, messageCount }, { status: 201 })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
