import 'dotenv/config'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function migrate() {
  const client = await pool.connect()
  try {
    // Ensure the migrations tracking table exists
    const { rowCount } = await client.query(`
      CREATE TABLE IF NOT EXISTS "_migrations" (
        "name"      TEXT        NOT NULL PRIMARY KEY,
        "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // If the tracking table was just created AND the "user" table already exists,
    // this is an existing database being brought under migration control.
    // Mark the baseline schema as applied without re-running it.
    const { rows: existingMigrations } = await client.query(`SELECT COUNT(*)::int AS c FROM "_migrations"`)
    const { rows: userTableCheck } = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user' LIMIT 1
    `)
    if (existingMigrations[0].c === 0 && userTableCheck.length > 0) {
      // Baseline already applied — record it so it is never re-run
      await client.query(`INSERT INTO "_migrations" ("name") VALUES ('001_schema.sql') ON CONFLICT DO NOTHING`)
      console.log('  mark  001_schema.sql (existing database — baseline skipped)')
    }

    // Collect all .sql files in db/migrations/, sorted by filename
    const migrationsDir = join(__dirname, 'migrations')
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    // Fetch already-applied migrations
    const { rows } = await client.query<{ name: string }>(`SELECT "name" FROM "_migrations"`)
    const applied = new Set(rows.map(r => r.name))

    let ran = 0
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  skip  ${file}`)
        continue
      }

      console.log(`  apply ${file}`)
      const sql = readFileSync(join(migrationsDir, file), 'utf8')

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(`INSERT INTO "_migrations" ("name") VALUES ($1)`, [file])
        await client.query('COMMIT')
        ran++
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
    }

    if (ran === 0) {
      console.log('Nothing to migrate — database is up to date.')
    } else {
      console.log(`\nApplied ${ran} migration(s).`)
    }
  } finally {
    client.release()
  }
}

migrate()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => pool.end())
