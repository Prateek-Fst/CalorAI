import { Router } from 'express';
import { getOrCreateUser, setOnboardingStep, markBlocked } from '../services/users.js';
import { User } from '../db.js';

const r = Router();

r.post('/', async (req, res) => {
  const { telegramId, username, firstName } = req.body;
  if (!telegramId) return res.status(400).json({ error: 'telegramId required' });
  const result = await getOrCreateUser({ telegramId, username, firstName });
  res.json(result);
});

r.get('/:telegramId', async (req, res) => {
  const user = await User.findOne({ telegramId: req.params.telegramId });
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json(user);
});

r.patch('/:id/onboarding', async (req, res) => {
  const { step, completed } = req.body;
  const user = await setOnboardingStep(req.params.id, step, completed);
  res.json(user);
});

r.post('/:telegramId/blocked', async (req, res) => {
  await markBlocked(req.params.telegramId);
  res.json({ ok: true });
});

// Register Expo push token from mobile app
r.post('/:telegramId/push-token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  const u = await User.findOneAndUpdate(
    { telegramId: String(req.params.telegramId) },
    { expoPushToken: token },
    { new: true }
  );
  if (!u) return res.status(404).json({ error: 'user not found' });
  res.json({ ok: true });
});

// Manual trigger endpoints (for demo/testing)
r.post('/_test/send-reminders', async (_req, res) => {
  const { sendDailyReminders } = await import('../services/notifications.js');
  await sendDailyReminders();
  res.json({ ok: true });
});
r.post('/_test/send-summaries', async (_req, res) => {
  const { sendDailySummaries } = await import('../services/notifications.js');
  await sendDailySummaries();
  res.json({ ok: true });
});

export default r;
