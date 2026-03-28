import 'dotenv/config'
import { Pool } from 'pg'

export const pool = new Pool({ connectionString: process.env.DATABASE_URL! })

// Windows defaults the pg client encoding to WIN1252 which can't store emoji.
// Force UTF-8 on every new physical connection.
pool.on('connect', client => {
  void client.query("SET client_encoding = 'UTF8'")
})

export default pool
