import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { pool } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

const PatchSchema = z.object({
  role: z.enum(['admin', 'user']).optional(),
  banned: z.boolean().optional(),
  banReason: z.string().max(500).optional().nullable(),
  discoverable: z.boolean().optional()
})

// PATCH /api/admin/users/[id] — change role or ban/unban
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  const { id } = await params

  if (id === admin.id) {
    return NextResponse.json({ error: 'You cannot modify your own account' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const {
    rows: [target]
  } = await pool.query(`SELECT "id" FROM "user" WHERE "id" = $1 LIMIT 1`, [id])
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { role, banned, banReason, discoverable } = parsed.data
  const sets: string[] = []
  const vals: any[] = []

  if (role !== undefined) sets.push(`"role" = $${vals.push(role)}`)
  if (banned !== undefined) {
    sets.push(`"banned" = $${vals.push(banned)}`)
    sets.push(`"banReason" = $${vals.push(banned ? (banReason ?? null) : null)}`)
    sets.push(`"banExpires" = $${vals.push(null)}`)
  }
  if (discoverable !== undefined) sets.push(`"discoverable" = $${vals.push(discoverable)}`)

  if (sets.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  vals.push(id)
  const {
    rows: [updated]
  } = await pool.query(
    `UPDATE "user" SET ${sets.join(', ')}, "updatedAt" = NOW()
     WHERE "id" = $${vals.length}
     RETURNING "id", "name", "email", "username", "image", "role", "banned", "banReason", "banExpires", "discoverable", "createdAt"`,
    vals
  )
  return NextResponse.json(updated)
}

// DELETE /api/admin/users/[id] — permanently delete user
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  const { id } = await params

  if (id === admin.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 403 })
  }

  const {
    rows: [target]
  } = await pool.query(`SELECT "id" FROM "user" WHERE "id" = $1 LIMIT 1`, [id])
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await pool.query(`DELETE FROM "user" WHERE "id" = $1`, [id])
  return new NextResponse(null, { status: 204 })
}
