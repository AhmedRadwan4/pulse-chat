import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { requireAuth } from '@/lib/session'

// GET /api/channels/:id/members
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  const { id } = await params

  const {
    rows: [membership]
  } = await pool.query(`SELECT 1 FROM "channel_member" WHERE "channelId" = $1 AND "userId" = $2 LIMIT 1`, [id, user.id])
  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const { rows: members } = await pool.query(
    `SELECT cm."id", cm."channelId", cm."userId", cm."role", cm."joinedAt",
      json_build_object(
        'id', u."id", 'name', u."name", 'username', u."username",
        'image', u."image", 'email', u."email"
      ) AS "user"
     FROM "channel_member" cm
     JOIN "user" u ON u."id" = cm."userId"
     WHERE cm."channelId" = $1
     ORDER BY cm."joinedAt" ASC`,
    [id]
  )
  return NextResponse.json({ members })
}

// POST /api/channels/:id/members — join a public channel
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  const { id } = await params

  const {
    rows: [channel]
  } = await pool.query(`SELECT "type" FROM "channel" WHERE "id" = $1 LIMIT 1`, [id])
  if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (channel.type === 'PRIVATE') {
    return NextResponse.json({ error: 'Cannot self-join a private channel' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const userId: string = body.userId ?? user.id

  if (userId !== user.id) {
    const {
      rows: [callerMembership]
    } = await pool.query(`SELECT "role" FROM "channel_member" WHERE "channelId" = $1 AND "userId" = $2 LIMIT 1`, [
      id,
      user.id
    ])
    if (!callerMembership || !['OWNER', 'ADMIN'].includes(callerMembership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const {
    rows: [member]
  } = await pool.query(
    `INSERT INTO "channel_member" ("channelId", "userId", "role")
     VALUES ($1, $2, 'MEMBER')
     ON CONFLICT ("channelId", "userId") DO UPDATE SET "role" = "channel_member"."role"
     RETURNING "id", "channelId", "userId", "role", "joinedAt"`,
    [id, userId]
  )

  const {
    rows: [userRow]
  } = await pool.query(`SELECT "id", "name", "username", "image" FROM "user" WHERE "id" = $1`, [userId])

  return NextResponse.json({ ...member, user: userRow }, { status: 201 })
}

// DELETE /api/channels/:id/members — leave a channel
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  const { id } = await params

  const {
    rows: [channel]
  } = await pool.query(`SELECT "createdById" FROM "channel" WHERE "id" = $1 LIMIT 1`, [id])
  if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (channel.createdById === user.id) {
    return NextResponse.json({ error: 'Owner cannot leave. Delete the channel instead.' }, { status: 400 })
  }

  await pool.query(`DELETE FROM "channel_member" WHERE "channelId" = $1 AND "userId" = $2`, [id, user.id])
  return NextResponse.json({ success: true })
}
