import { Router } from 'express';
import {
  getOrCreateUser, setOnboardingStep, markBlocked,
  findUserByTelegramId, setExpoPushToken,
} from '../services/users.js';

const r = Router();

r.post('/', async (req, res) => {
  try {
    const { telegramId, username, firstName } = req.body;
    if (!telegramId) return res.status(400).json({ error: 'telegramId required' });
    const result = await getOrCreateUser({ telegramId, username, firstName });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.get('/:telegramId', async (req, res) => {
  try {
    const user = await findUserByTelegramId(req.params.telegramId);
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.patch('/:id/onboarding', async (req, res) => {
  try {
    const { step, completed } = req.body;
    const user = await setOnboardingStep(req.params.id, step, completed);
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post('/:telegramId/blocked', async (req, res) => {
  try {
    await markBlocked(req.params.telegramId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post('/:telegramId/push-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });
    const u = await setExpoPushToken(req.params.telegramId, token);
    if (!u) return res.status(404).json({ error: 'user not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
