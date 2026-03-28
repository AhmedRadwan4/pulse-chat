import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { requireAuth } from '@/lib/session'

// PATCH /api/notifications/:id/read
export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  const { id } = await params

  await pool.query(`UPDATE "notification" SET "read" = true WHERE "id" = $1 AND "userId" = $2`, [id, user.id])
  return NextResponse.json({ ok: true })
}
