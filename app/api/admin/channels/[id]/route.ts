import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { pool } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(250).optional().nullable()
})

// PATCH /api/admin/channels/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  const {
    rows: [channel]
  } = await pool.query(`SELECT "id" FROM "channel" WHERE "id" = $1 LIMIT 1`, [id])
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const body = await request.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const sets: string[] = []
  const vals: any[] = []
  if (parsed.data.name !== undefined) sets.push(`"name" = $${vals.push(parsed.data.name)}`)
  if (parsed.data.description !== undefined) sets.push(`"description" = $${vals.push(parsed.data.description)}`)
  if (sets.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  vals.push(id)
  const {
    rows: [updated]
  } = await pool.query(
    `UPDATE "channel" SET ${sets.join(', ')}, "updatedAt" = NOW()
     WHERE "id" = $${vals.length}
     RETURNING *`,
    vals
  )

  const {
    rows: [withRelations]
  } = await pool.query(
    `SELECT
      c.*,
      json_build_object('id', u."id", 'name', u."name", 'email', u."email") AS "createdBy",
      (SELECT COUNT(*)::int FROM "channel_member" WHERE "channelId" = c."id") AS "memberCount",
      (SELECT COUNT(*)::int FROM "message" WHERE "channelId" = c."id") AS "messageCount"
     FROM "channel" c
     JOIN "user" u ON u."id" = c."createdById"
     WHERE c."id" = $1`,
    [updated.id]
  )

  return NextResponse.json(withRelations)
}

// DELETE /api/admin/channels/[id]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  const {
    rows: [channel]
  } = await pool.query(`SELECT "id" FROM "channel" WHERE "id" = $1 LIMIT 1`, [id])
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  await pool.query(`DELETE FROM "channel" WHERE "id" = $1`, [id])
  return new NextResponse(null, { status: 204 })
}
