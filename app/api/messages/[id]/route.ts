import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { pool } from '@/lib/db'
import { requireAuth } from '@/lib/session'

const EditSchema = z.object({
  content: z.string().min(1).max(4000)
})

// PATCH /api/messages/:id — edit a message
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  const { id } = await params

  const {
    rows: [message]
  } = await pool.query(`SELECT "id", "senderId", "deletedAt" FROM "message" WHERE "id" = $1 LIMIT 1`, [id])
  if (!message || message.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (message.senderId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = EditSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const {
    rows: [updated]
  } = await pool.query(
    `UPDATE "message" SET "content" = $1, "editedAt" = NOW()
     WHERE "id" = $2
     RETURNING
       "id", "channelId", "senderId", "content", "threadId", "editedAt", "deletedAt", "createdAt"`,
    [parsed.data.content, id]
  )

  return NextResponse.json({ ...updated, sender: null, attachments: [], reactions: [] })
}

// DELETE /api/messages/:id — soft-delete a message
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  const { id } = await params

  const {
    rows: [message]
  } = await pool.query(`SELECT "id", "senderId", "deletedAt" FROM "message" WHERE "id" = $1 LIMIT 1`, [id])
  if (!message || message.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (message.senderId !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await pool.query(`UPDATE "message" SET "deletedAt" = NOW(), "content" = NULL WHERE "id" = $1`, [id])
  return NextResponse.json({ success: true })
}
