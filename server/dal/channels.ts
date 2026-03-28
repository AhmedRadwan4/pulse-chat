import { pool } from '../db'

export async function createChannel(
  data: { name?: string; description?: string; type?: 'PUBLIC' | 'PRIVATE' | 'DIRECT' },
  creatorId: string
) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const {
      rows: [channel]
    } = await client.query(
      `INSERT INTO "channel" ("name", "description", "type", "createdById")
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.name ?? null, data.description ?? null, data.type ?? 'PUBLIC', creatorId]
    )
    await client.query(`INSERT INTO "channel_member" ("channelId", "userId", "role") VALUES ($1, $2, 'OWNER')`, [
      channel.id,
      creatorId
    ])
    await client.query('COMMIT')

    const { rows: members } = await pool.query(
      `SELECT cm.*, row_to_json(u.*) AS "user"
       FROM "channel_member" cm
       JOIN "user" u ON u."id" = cm."userId"
       WHERE cm."channelId" = $1`,
      [channel.id]
    )
    return { ...channel, members }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getChannel(channelId: string) {
  const {
    rows: [channel]
  } = await pool.query(`SELECT * FROM "channel" WHERE "id" = $1`, [channelId])
  if (!channel) return null
  const { rows: members } = await pool.query(
    `SELECT cm."id", cm."channelId", cm."userId", cm."role", cm."joinedAt",
      json_build_object('id', u."id", 'name', u."name", 'username', u."username", 'image', u."image") AS "user"
     FROM "channel_member" cm
     JOIN "user" u ON u."id" = cm."userId"
     WHERE cm."channelId" = $1
     ORDER BY cm."joinedAt" ASC`,
    [channelId]
  )
  return { ...channel, members }
}

export async function getUserChannels(userId: string) {
  const { rows } = await pool.query(
    `SELECT c.*,
      (SELECT "role" FROM "channel_member" WHERE "channelId" = c."id" AND "userId" = $1) AS "memberRole"
     FROM "channel" c
     JOIN "channel_member" cm ON cm."channelId" = c."id"
     WHERE cm."userId" = $1
     ORDER BY cm."joinedAt" ASC`,
    [userId]
  )
  return rows
}

export async function addMember(channelId: string, userId: string, role: 'OWNER' | 'ADMIN' | 'MEMBER' = 'MEMBER') {
  const {
    rows: [member]
  } = await pool.query(
    `INSERT INTO "channel_member" ("channelId", "userId", "role")
     VALUES ($1, $2, $3)
     ON CONFLICT ("channelId", "userId") DO UPDATE SET "role" = EXCLUDED."role"
     RETURNING *`,
    [channelId, userId, role]
  )
  return member
}

export async function removeMember(channelId: string, userId: string) {
  await pool.query(`DELETE FROM "channel_member" WHERE "channelId" = $1 AND "userId" = $2`, [channelId, userId])
}

export async function isMember(channelId: string, userId: string): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM "channel_member" WHERE "channelId" = $1 AND "userId" = $2 LIMIT 1`, [
    channelId,
    userId
  ])
  return rows.length > 0
}

export async function getMemberRole(channelId: string, userId: string) {
  const { rows } = await pool.query(
    `SELECT "role" FROM "channel_member" WHERE "channelId" = $1 AND "userId" = $2 LIMIT 1`,
    [channelId, userId]
  )
  return (rows[0]?.role as 'OWNER' | 'ADMIN' | 'MEMBER' | null) ?? null
}
