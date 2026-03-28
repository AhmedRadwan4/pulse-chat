import 'dotenv/config'
import { Pool } from 'pg'
import { auth } from '../lib/auth'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function seed() {
  console.log('Seeding PulseChat database...')

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@pulsechat.dev'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!'

  let {
    rows: [adminUser]
  } = await pool.query(`SELECT "id" FROM "user" WHERE "email" = $1 LIMIT 1`, [adminEmail])

  if (!adminUser) {
    await auth.api.signUpEmail({
      body: { name: 'Admin', email: adminEmail, password: adminPassword }
    })
    const res = await pool.query(`SELECT "id" FROM "user" WHERE "email" = $1 LIMIT 1`, [adminEmail])
    adminUser = res.rows[0]
    console.log(`Created admin user: ${adminEmail}`)
  } else {
    console.log(`Admin user already exists: ${adminEmail}`)
  }

  if (!adminUser) throw new Error('Failed to create admin user')

  await pool.query(`UPDATE "user" SET "role" = 'admin', "emailVerified" = true WHERE "id" = $1`, [adminUser.id])

  const defaultChannels = [
    { name: 'general', description: 'General discussion for everyone' },
    { name: 'announcements', description: 'Important announcements from the team' },
    { name: 'random', description: 'Off-topic chat and fun stuff' }
  ]

  for (const ch of defaultChannels) {
    const {
      rows: [existing]
    } = await pool.query(`SELECT "id" FROM "channel" WHERE "name" = $1 LIMIT 1`, [ch.name])
    if (!existing) {
      const {
        rows: [channel]
      } = await pool.query(
        `INSERT INTO "channel" ("name", "description", "type", "createdById")
         VALUES ($1, $2, 'PUBLIC', $3) RETURNING "id", "name"`,
        [ch.name, ch.description, adminUser.id]
      )
      await pool.query(`INSERT INTO "channel_member" ("channelId", "userId", "role") VALUES ($1, $2, 'OWNER')`, [
        channel.id,
        adminUser.id
      ])
      console.log(`Created channel: #${channel.name}`)
    } else {
      console.log(`Channel already exists: #${ch.name}`)
    }
  }

  console.log('Seeding complete.')
}

seed()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => pool.end())
