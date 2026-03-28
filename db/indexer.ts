import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function clearTables() {
  console.log('Clearing existing data...')

  // Delete in FK-safe order (children before parents)
  await pool.query(`DELETE FROM "notification"`)
  await pool.query(`DELETE FROM "read_receipt"`)
  await pool.query(`DELETE FROM "reaction"`)
  await pool.query(`DELETE FROM "attachment"`)
  await pool.query(`DELETE FROM "message"`)
  await pool.query(`DELETE FROM "thread"`)
  await pool.query(`DELETE FROM "channel_member"`)
  await pool.query(`DELETE FROM "channel"`)
  await pool.query(`DELETE FROM "session"`)
  await pool.query(`DELETE FROM "account"`)
  await pool.query(`DELETE FROM "user"`)
  await pool.query(`DELETE FROM "verification"`)
  await pool.query(`DELETE FROM "webhook_event"`)

  console.log('All tables cleared.')
}

clearTables()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => pool.end())
