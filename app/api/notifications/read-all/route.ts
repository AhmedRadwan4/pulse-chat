import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { requireAuth } from '@/lib/session'

// POST /api/notifications/read-all
export async function POST() {
  const user = await requireAuth()
  await pool.query(`UPDATE "notification" SET "read" = true WHERE "userId" = $1 AND "read" = false`, [user.id])
  return NextResponse.json({ ok: true })
}
