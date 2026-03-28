import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { requireAuth } from '@/lib/session'

// GET /api/users — list all users except the current user (for DM user picker)
export async function GET() {
  const user = await requireAuth()

  const { rows: users } = await pool.query(
    `SELECT "id", "name", "username", "image"
     FROM "user"
     WHERE "id" != $1
       AND "discoverable" = TRUE
     ORDER BY "name" ASC NULLS LAST`,
    [user.id]
  )

  return NextResponse.json({ users })
}
