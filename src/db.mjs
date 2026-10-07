import { readFile } from 'node:fs/promises';
import pg from 'pg';

const { Pool } = pg;
const passwordPath = process.env.DB_PASSWORD_FILE;
let password = process.env.DB_PASSWORD;
if (passwordPath) password = (await readFile(passwordPath, 'utf8')).trim();
if (!password) throw new Error('Database password is missing. Set DB_PASSWORD_FILE or DB_PASSWORD.');

export const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'collegeos',
  user: process.env.DB_USER || 'collegeos',
  password,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 5_000,
  application_name: 'college-management-system'
});

pool.on('error', () => {
  // Do not print database errors: they can contain connection or query details.
  console.error(JSON.stringify({ level: 'error', event: 'database_pool_error' }));
});
