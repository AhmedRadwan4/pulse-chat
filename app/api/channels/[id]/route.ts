import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { pool } from '@/lib/db'
import { requireAuth } from '@/lib/session'

const UpdateChannelSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(250).optional()
})

// GET /api/channels/:id
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  const { id } = await params

  const {
    rows: [membership]
  } = await pool.query(`SELECT 1 FROM "channel_member" WHERE "channelId" = $1 AND "userId" = $2 LIMIT 1`, [id, user.id])
  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const {
    rows: [channel]
  } = await pool.query(
    `SELECT c.*,
      (SELECT COUNT(*)::int FROM "channel_member" WHERE "channelId" = c."id") AS "memberCount",
      (SELECT COUNT(*)::int FROM "message" WHERE "channelId" = c."id") AS "messageCount"
     FROM "channel" c WHERE c."id" = $1`,
    [id]
  )
  if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { rows: members } = await pool.query(
    `SELECT cm."id", cm."channelId", cm."userId", cm."role", cm."joinedAt",
      json_build_object('id', u."id", 'name', u."name", 'username', u."username", 'image', u."image") AS "user"
     FROM "channel_member" cm
     JOIN "user" u ON u."id" = cm."userId"
     WHERE cm."channelId" = $1
     ORDER BY cm."joinedAt" ASC`,
    [id]
  )

  return NextResponse.json({ ...channel, members })
}

// PATCH /api/channels/:id
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  const { id } = await params

  const {
    rows: [membership]
  } = await pool.query(`SELECT "role" FROM "channel_member" WHERE "channelId" = $1 AND "userId" = $2 LIMIT 1`, [
    id,
    user.id
  ])
  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = UpdateChannelSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const sets: string[] = []
  const vals: any[] = []
  if (parsed.data.name !== undefined) {
    sets.push(`"name" = $${vals.push(parsed.data.name)}`)
  }
  if (parsed.data.description !== undefined) {
    sets.push(`"description" = $${vals.push(parsed.data.description)}`)
  }
  if (sets.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  vals.push(id)
  const {
    rows: [channel]
  } = await pool.query(
    `UPDATE "channel" SET ${sets.join(', ')}, "updatedAt" = NOW() WHERE "id" = $${vals.length} RETURNING *`,
    vals
  )
  return NextResponse.json(channel)
}

// DELETE /api/channels/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  const { id } = await params

  const {
    rows: [channel]
  } = await pool.query(`SELECT "createdById" FROM "channel" WHERE "id" = $1 LIMIT 1`, [id])
  if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (channel.createdById !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await pool.query(`DELETE FROM "channel" WHERE "id" = $1`, [id])
  return NextResponse.json({ success: true })
}
