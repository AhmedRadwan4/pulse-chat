import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

const globalForDb = globalThis as unknown as {
  _pool: Pool | undefined
  _db: Kysely<any> | undefined
}

const isNewPool = !globalForDb._pool
export const pool: Pool = globalForDb._pool ?? new Pool({ connectionString: process.env.DATABASE_URL })

if (isNewPool) {
  // Windows defaults the pg client encoding to WIN1252 which can't store emoji.
  // Force UTF-8 on every new physical connection.
  pool.on('connect', client => {
    void client.query("SET client_encoding = 'UTF8'")
  })
}

export const db: Kysely<any> = globalForDb._db ?? new Kysely({ dialect: new PostgresDialect({ pool }) })

if (process.env.NODE_ENV !== 'production') {
  globalForDb._pool = pool
  globalForDb._db = db
}

export default pool
