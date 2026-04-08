import { Expo } from 'expo-server-sdk';
import cron from 'node-cron';
import { supabase, toCamel } from '../db.js';
import { logEvent } from './events.js';

const expo = new Expo();

export async function sendPush(token, title, body, data = {}) {
  if (!Expo.isExpoPushToken(token)) return { error: 'invalid token' };
  const message = { to: token, sound: 'default', title, body, data };
  try {
    const tickets = await expo.sendPushNotificationsAsync([message]);
    return tickets[0];
  } catch (e) {
    console.warn('[push] send failed:', e.message);
    return { error: e.message };
  }
}

async function listPushTargets() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('blocked', false)
    .not('expo_push_token', 'is', null);
  if (error) throw error;
  return toCamel(data);
}

export async function sendDailyReminders() {
  const users = await listPushTargets();
  console.log(`[push] daily reminder → ${users.length} users`);
  for (const u of users) {
    await sendPush(u.expoPushToken, '🍽️ Time to log your meal!', 'Tap to log what you ate today.');
    await logEvent(u.id, 'push_reminder_sent', {});
  }
}

export async function sendDailySummaries() {
  const users = await listPushTargets();
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  console.log(`[push] daily summary → ${users.length} users`);
  for (const u of users) {
    const { count } = await supabase
      .from('meals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.id)
      .gte('logged_at', startOfDay.toISOString());
    const c = count || 0;
    await sendPush(
      u.expoPushToken,
      '📊 Your daily summary',
      `You logged ${c} meal${c === 1 ? '' : 's'} today.`,
      { type: 'daily_summary', count: c }
    );
    await logEvent(u.id, 'push_summary_sent', { count: c });
  }
}

export function startCronJobs() {
  const reminderExpr = process.env.DAILY_REMINDER_CRON || '0 19 * * *';
  const summaryExpr = process.env.DAILY_SUMMARY_CRON || '0 21 * * *';
  cron.schedule(reminderExpr, sendDailyReminders);
  cron.schedule(summaryExpr, sendDailySummaries);
  console.log(`[cron] daily reminder "${reminderExpr}", summary "${summaryExpr}"`);
}
