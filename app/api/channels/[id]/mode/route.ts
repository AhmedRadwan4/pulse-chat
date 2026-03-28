import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { pool } from '@/lib/db'
import redis from '@/lib/redis-client'
import { requireAdmin } from '@/lib/session'

const ModeSchema = z.object({
  mode: z.enum(['MONITORED', 'E2E_ENCRYPTED'])
})

// PATCH /api/channels/:id/mode  (admin only)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  const { id } = await params

  const {
    rows: [channel]
  } = await pool.query(`SELECT "id", "type" FROM "channel" WHERE "id" = $1 LIMIT 1`, [id])
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  if (channel.type === 'DIRECT') {
    return NextResponse.json({ error: 'Direct message channels are always end-to-end encrypted' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = ModeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { mode } = parsed.data

  const {
    rows: [updated]
  } = await pool.query(
    `UPDATE "channel"
     SET "mode" = $1, "modeChangedAt" = NOW(), "modeChangedBy" = $2, "updatedAt" = NOW()
     WHERE "id" = $3
     RETURNING *`,
    [mode, admin.id, id]
  )

  const systemContent =
    mode === 'E2E_ENCRYPTED' ? 'This conversation is now end-to-end encrypted.' : 'This conversation is now monitored.'

  await pool.query(`INSERT INTO "message" ("channelId", "senderId", "content") VALUES ($1, $2, $3)`, [
    id,
    admin.id,
    systemContent
  ])

  await redis.publish(
    'channel:mode-changed',
    JSON.stringify({ channelId: id, mode, changedBy: admin.id, changedAt: updated.modeChangedAt })
  )

  return NextResponse.json(updated)
}
