import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

export async function GET() {
  await requireAdmin()

  const {
    rows: [stats]
  } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM "user") AS "userCount",
      (SELECT COUNT(*)::int FROM "channel" WHERE "type" != 'DIRECT') AS "channelCount",
      (SELECT COUNT(*)::int FROM "message" WHERE "deletedAt" IS NULL) AS "messageCount",
      (SELECT COUNT(*)::int FROM "user" WHERE "banned" = true) AS "bannedCount"
  `)

  return NextResponse.json(stats)
}
