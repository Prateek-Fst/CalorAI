import { supabase, toCamel } from '../db.js';
import { logEvent } from './events.js';
import { getOrAssign } from './experiments.js';

export async function findUserByTelegramId(telegramId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', String(telegramId))
    .maybeSingle();
  if (error) throw error;
  return toCamel(data);
}

export async function getOrCreateUser({ telegramId, username, firstName }) {
  let user = await findUserByTelegramId(telegramId);
  let isNew = false;

  if (!user) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        telegram_id: String(telegramId),
        username: username || null,
        first_name: firstName || null,
      })
      .select()
      .single();
    if (error) throw error;
    user = toCamel(data);
    isNew = true;
    await logEvent(user.id, 'user_created', { telegramId: user.telegramId });
  }

  // Touch last_active_at
  await supabase
    .from('users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', user.id);

  const { user: updatedUser, group } = await getOrAssign(user);
  return { user: updatedUser, group, isNew };
}

export async function setOnboardingStep(userId, step, completed = false) {
  const update = { onboarding_step: step };
  if (completed) update.onboarding_completed = true;
  const { data, error } = await supabase
    .from('users')
    .update(update)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

export async function markBlocked(telegramId) {
  const { error } = await supabase
    .from('users')
    .update({ blocked: true })
    .eq('telegram_id', String(telegramId));
  if (error) throw error;
  return { ok: true };
}

export async function setExpoPushToken(telegramId, token) {
  const { data, error } = await supabase
    .from('users')
    .update({ expo_push_token: token })
    .eq('telegram_id', String(telegramId))
    .select()
    .maybeSingle();
  if (error) throw error;
  return toCamel(data);
}
