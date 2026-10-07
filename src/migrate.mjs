import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { pool } from './db.mjs';

export async function migrate() {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');
  const files = (await readdir(dir)).filter((name) => /^\d+_[a-z0-9_-]+\.sql$/.test(name)).sort();
  const client = await pool.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const name of files) {
      if ((await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name])).rowCount) continue;
      const sql = await readFile(join(dir, name), 'utf8');
      await client.query('BEGIN');
      try { await client.query(sql); await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]); await client.query('COMMIT'); console.info(JSON.stringify({ level: 'info', event: 'migration_applied', name })); }
      catch (error) { await client.query('ROLLBACK'); throw error; }
    }
  } finally { client.release(); }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { await migrate(); await pool.end(); }
  catch { console.error(JSON.stringify({ level: 'error', event: 'migration_failed' })); await pool.end(); process.exitCode = 1; }
}
