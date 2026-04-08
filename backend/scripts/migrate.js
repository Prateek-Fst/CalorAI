#!/usr/bin/env node
/**
 * Run all SQL files in backend/migrations/ in alphabetical order.
 *
 * Requires SUPABASE_DB_URL in backend/.env, e.g.
 *   SUPABASE_DB_URL=postgresql://postgres:YOUR-PASSWORD@db.<project-ref>.supabase.co:5432/postgres
 *
 * Get the password from: Supabase Dashboard → Project Settings → Database → Connection string
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('❌ SUPABASE_DB_URL is not set in backend/.env');
  console.error('');
  console.error('   Get your DB password from: Supabase → Project Settings → Database');
  console.error('   Then add to backend/.env:');
  console.error('   SUPABASE_DB_URL=postgresql://postgres:YOUR-PASSWORD@db.<project>.supabase.co:5432/postgres');
  console.error('');
  console.error('   Alternatively, copy backend/migrations/001_init.sql into the Supabase SQL Editor and run it manually.');
  process.exit(1);
}

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    await client.connect();
    console.log('🔌 connected to Supabase Postgres');

    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    if (files.length === 0) {
      console.log('No migration files found.');
      process.exit(0);
    }

    for (const file of files) {
      console.log(`▶ running ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query(sql);
      console.log(`✅ ${file} applied`);
    }
    console.log('🎉 all migrations applied');
  } catch (err) {
    console.error('❌ migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
