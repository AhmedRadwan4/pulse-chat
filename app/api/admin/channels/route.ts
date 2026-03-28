import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

// GET /api/admin/channels?page=1&limit=20&type=PUBLIC|PRIVATE|DIRECT&search=
export async function GET(request: NextRequest) {
  await requireAdmin()

  const { searchParams } = request.nextUrl
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))
  const type = searchParams.get('type')
  const search = searchParams.get('search')?.trim() ?? ''
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []

  if (type) {
    params.push(type)
    conditions.push(`c."type" = $${params.length}`)
  }
  if (search) {
    params.push(`%${search}%`)
    conditions.push(`c."name" ILIKE $${params.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const countParams = [...params]
  params.push(limit, offset)

  const [
    { rows: channels },
    {
      rows: [{ count }]
    }
  ] = await Promise.all([
    pool.query(
      `SELECT
        c.*,
        json_build_object('id', u."id", 'name', u."name", 'email', u."email") AS "createdBy",
        (SELECT COUNT(*)::int FROM "channel_member" WHERE "channelId" = c."id") AS "memberCount",
        (SELECT COUNT(*)::int FROM "message" WHERE "channelId" = c."id") AS "messageCount"
       FROM "channel" c
       JOIN "user" u ON u."id" = c."createdById"
       ${where}
       ORDER BY c."createdAt" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    pool.query(`SELECT COUNT(*)::int AS "count" FROM "channel" c ${where}`, countParams)
  ])

  return NextResponse.json({ channels, total: count, page, limit })
}
