import { pool } from '../db'

export async function addReaction(messageId: string, userId: string, emoji: string) {
  const {
    rows: [reaction]
  } = await pool.query(
    `INSERT INTO "reaction" ("messageId", "userId", "emoji")
     VALUES ($1, $2, $3)
     ON CONFLICT ("messageId", "userId", "emoji") DO NOTHING
     RETURNING *`,
    [messageId, userId, emoji]
  )
  return reaction
}

export async function removeReaction(messageId: string, userId: string, emoji: string) {
  await pool.query(`DELETE FROM "reaction" WHERE "messageId" = $1 AND "userId" = $2 AND "emoji" = $3`, [
    messageId,
    userId,
    emoji
  ])
}

export async function getReactions(messageId: string) {
  const { rows } = await pool.query(
    `SELECT r."emoji", r."userId", u."id", u."name", u."username"
     FROM "reaction" r
     JOIN "user" u ON u."id" = r."userId"
     WHERE r."messageId" = $1
     ORDER BY r."createdAt" ASC`,
    [messageId]
  )

  const grouped = rows.reduce<
    Record<string, { emoji: string; count: number; users: { id: string; name: string; username: string | null }[] }>
  >((acc, row) => {
    if (!acc[row.emoji]) acc[row.emoji] = { emoji: row.emoji, count: 0, users: [] }
    acc[row.emoji].count++
    acc[row.emoji].users.push({ id: row.id, name: row.name, username: row.username })
    return acc
  }, {})
  return Object.values(grouped)
}
