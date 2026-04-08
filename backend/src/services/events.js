import { supabase, toCamel } from '../db.js';

export async function logEvent(userId, eventName, properties = {}) {
  const { data, error } = await supabase
    .from('events')
    .insert({ user_id: userId || null, event_name: eventName, properties })
    .select()
    .single();
  if (error) {
    console.warn('[events] insert failed:', error.message);
    return null;
  }
  return toCamel(data);
}

export async function listRecentEvents(limit = 200) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return toCamel(data);
}
