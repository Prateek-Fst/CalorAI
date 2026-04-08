import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('[db] SUPABASE_URL or SUPABASE_ANON_KEY missing in backend/.env');
  process.exit(1);
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

export async function pingDB() {
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) {
    console.error('[db] Supabase ping failed:', error.message);
    console.error('[db] Did you run backend/db/schema.sql in the Supabase SQL editor?');
    process.exit(1);
  }
  console.log('[db] connected to Supabase:', url);
}

/**
 * Convert a snake_case Postgres row to the camelCase shape the API/clients expect.
 * Also aliases `id` → `_id` so existing bot/dashboard/mobile code keeps working.
 */
export function toCamel(row) {
  if (!row) return row;
  if (Array.isArray(row)) return row.map(toCamel);
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  if (out.id) out._id = out.id;
  return out;
}
