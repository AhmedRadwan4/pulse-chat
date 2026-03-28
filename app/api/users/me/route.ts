import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { requireAuth } from '@/lib/session'

// GET /api/users/me — current user's profile fields used in settings
export async function GET() {
  const user = await requireAuth()

  const {
    rows: [row]
  } = await pool.query(
    `SELECT "id", "name", "username", "image", "bio", "discoverable" FROM "user" WHERE "id" = $1 LIMIT 1`,
    [user.id]
  )

  return NextResponse.json(row)
}

// PATCH /api/users/me — update own profile settings
export async function PATCH(request: NextRequest) {
  const user = await requireAuth()
  const body = await request.json()

  if (typeof body.discoverable !== 'boolean') {
    return NextResponse.json({ error: 'discoverable must be a boolean' }, { status: 400 })
  }

  const {
    rows: [updated]
  } = await pool.query(
    `UPDATE "user" SET "discoverable" = $1, "updatedAt" = NOW()
     WHERE "id" = $2
     RETURNING "discoverable"`,
    [body.discoverable, user.id]
  )

  return NextResponse.json(updated)
}
