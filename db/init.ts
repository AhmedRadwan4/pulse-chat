import 'dotenv/config'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function init() {
  console.log('Initializing PulseChat database schema...')
  const client = await pool.connect()
  try {
    await client.query(`SET client_encoding = 'UTF8'`)
    const sql = readFileSync(join(__dirname, 'migrations/001_schema.sql'), 'utf8')
    await client.query(sql)
    console.log('Schema applied successfully.')
  } finally {
    client.release()
  }
}

init()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => pool.end())
