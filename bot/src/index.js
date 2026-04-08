import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import {
  upsertUser, updateOnboarding, logEvent,
  listMeals, addMeal, updateMeal, deleteMeal,
} from './api.js';

if (!process.env.BOT_TOKEN) {
  console.error('[bot] ERROR: BOT_TOKEN not set. Create bot/.env from .env.example');
  process.exit(1);
}
console.log('[bot] starting, backend =', process.env.BACKEND_URL || 'http://localhost:4000');
const bot = new Telegraf(process.env.BOT_TOKEN);

const ONBOARDING = [
  '👋 Welcome to CalorAI! I help you track meals and reach your health goals.\n\nStep 1/3: I work best when you log meals consistently. Quick logging takes < 10 seconds.',
  'Step 2/3: You can log a meal anytime by typing:\n`/log Chicken salad 450`\n\nOr just `/log Pizza` and skip calories.',
  'Step 3/3: View your meals with /meals, edit with /edit, delete with /delete.\n\nYou\'re all set! Try logging your first meal now. 🥗',
];

bot.start(async (ctx) => {
  const tgUser = ctx.from;
  const { user, group, isNew } = await upsertUser({
    telegramId: tgUser.id,
    username: tgUser.username,
    firstName: tgUser.first_name,
  });
  await logEvent(user._id, 'start_command', { isNew, group });

  if (group === 'control') {
    await ctx.reply(`Hi ${tgUser.first_name}! Welcome to CalorAI. Use /log <meal> to log a meal, /meals to view them.`);
    return;
  }

  // Test group: 3-step onboarding
  await updateOnboarding(user._id, 1, false);
  await logEvent(user._id, 'onboarding_step_view', { step: 1 });
  await ctx.reply(ONBOARDING[0], Markup.inlineKeyboard([Markup.button.callback('Next ▶️', 'onb_2')]));
});

bot.action('onb_2', async (ctx) => {
  const { user } = await upsertUser({ telegramId: ctx.from.id, username: ctx.from.username, firstName: ctx.from.first_name });
  await updateOnboarding(user._id, 2, false);
  await logEvent(user._id, 'onboarding_step_view', { step: 2 });
  await ctx.editMessageText(ONBOARDING[1], { parse_mode: 'Markdown', ...Markup.inlineKeyboard([Markup.button.callback('Next ▶️', 'onb_3')]) });
});

bot.action('onb_3', async (ctx) => {
  const { user } = await upsertUser({ telegramId: ctx.from.id, username: ctx.from.username, firstName: ctx.from.first_name });
  await updateOnboarding(user._id, 3, true);
  await logEvent(user._id, 'onboarding_completed', {});
  await ctx.editMessageText(ONBOARDING[2]);
});

// Parse "Name [calories]" — last token if numeric is calories
function parseMealText(text) {
  const tokens = text.trim().split(/\s+/);
  let calories;
  if (tokens.length > 1 && /^\d+$/.test(tokens.at(-1))) {
    calories = parseInt(tokens.pop(), 10);
  }
  return { name: tokens.join(' '), calories };
}

bot.command('log', async (ctx) => {
  const text = ctx.message.text.replace(/^\/log(@\w+)?\s*/, '');
  if (!text) return ctx.reply('Usage: /log <meal name> [calories]\nExample: /log Chicken salad 450');
  const { name, calories } = parseMealText(text);
  const meal = await addMeal(ctx.from.id, { name, calories });
  await ctx.reply(`✅ Logged: *${meal.name}*${calories ? ` (${calories} kcal)` : ''}\nID: \`${meal._id}\``, { parse_mode: 'Markdown' });
});

bot.command('meals', async (ctx) => {
  const meals = await listMeals(ctx.from.id);
  if (!meals.length) return ctx.reply('No meals logged yet. Try /log <meal>');
  const lines = meals.slice(0, 20).map((m, i) => {
    const time = new Date(m.loggedAt).toLocaleString();
    return `${i + 1}. *${m.name}*${m.calories ? ` — ${m.calories} kcal` : ''}\n   _${time}_\n   id: \`${m._id}\``;
  });
  await ctx.reply(lines.join('\n\n'), { parse_mode: 'Markdown' });
});

bot.command('edit', async (ctx) => {
  const args = ctx.message.text.replace(/^\/edit(@\w+)?\s*/, '');
  const [id, ...rest] = args.split(/\s+/);
  if (!id || !rest.length) return ctx.reply('Usage: /edit <id> <new name> [calories]');
  const { name, calories } = parseMealText(rest.join(' '));
  const meal = await updateMeal(ctx.from.id, id, { name, calories });
  if (!meal) return ctx.reply('Meal not found.');
  await ctx.reply(`✏️ Updated: *${meal.name}*${meal.calories ? ` (${meal.calories} kcal)` : ''}`, { parse_mode: 'Markdown' });
});

bot.command('delete', async (ctx) => {
  const id = ctx.message.text.replace(/^\/delete(@\w+)?\s*/, '').trim();
  if (!id) return ctx.reply('Usage: /delete <id>');
  try {
    await deleteMeal(ctx.from.id, id);
    await ctx.reply('🗑️ Deleted.');
  } catch {
    await ctx.reply('Meal not found.');
  }
});

bot.command('myid', (ctx) =>
  ctx.reply(`Your Telegram ID: \`${ctx.from.id}\`\n\nUse this in the mobile app to sync your meals.`, { parse_mode: 'Markdown' })
);

bot.command('help', (ctx) => ctx.reply(
  'Commands:\n/start - begin\n/log <meal> [cals] - log meal\n/meals - list meals\n/edit <id> <name> [cals]\n/delete <id>\n/myid - get your Telegram ID for the mobile app'
));

// Detect blocks
bot.catch(async (err, ctx) => {
  if (err?.response?.error_code === 403) {
    try { await fetch(`${process.env.BACKEND_URL}/api/users/${ctx.from.id}/blocked`, { method: 'POST' }); } catch {}
  }
  console.error('[bot]', err.message);
});

bot.launch();
console.log('[bot] running — send /start to your bot in Telegram');
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
