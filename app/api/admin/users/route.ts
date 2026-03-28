import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

// GET /api/admin/users?page=1&limit=20&search=
export async function GET(request: NextRequest) {
  await requireAdmin()

  const { searchParams } = request.nextUrl
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))
  const search = searchParams.get('search')?.trim() ?? ''
  const offset = (page - 1) * limit

  const params: any[] = []
  let whereClause = ''
  if (search) {
    params.push(`%${search}%`)
    whereClause = `WHERE "name" ILIKE $1 OR "email" ILIKE $1 OR "username" ILIKE $1`
  }

  const limitIdx = params.length + 1
  const offsetIdx = params.length + 2

  const [
    { rows: users },
    {
      rows: [{ count }]
    }
  ] = await Promise.all([
    pool.query(
      `SELECT "id", "name", "email", "username", "image", "role", "banned", "banReason", "banExpires", "discoverable", "createdAt"
       FROM "user" ${whereClause}
       ORDER BY "createdAt" DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*)::int AS "count" FROM "user" ${whereClause}`, params)
  ])

  return NextResponse.json({ users, total: count, page, limit })
}
