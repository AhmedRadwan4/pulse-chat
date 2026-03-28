import { pool } from '../db'

export async function getUserById(id: string) {
  const { rows } = await pool.query(
    `SELECT "id", "name", "email", "username", "image", "role", "banned"
     FROM "user" WHERE "id" = $1 LIMIT 1`,
    [id]
  )
  return rows[0] ?? null
}

export async function getUsersByChannel(channelId: string) {
  const { rows } = await pool.query(
    `SELECT u."id", u."name", u."email", u."username", u."image", u."role"
     FROM "channel_member" cm
     JOIN "user" u ON u."id" = cm."userId"
     WHERE cm."channelId" = $1`,
    [channelId]
  )
  return rows
}
