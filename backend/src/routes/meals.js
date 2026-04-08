import { Router } from 'express';
import { addMeal, listMeals, updateMeal, deleteMeal } from '../services/meals.js';
import { findUserByTelegramId } from '../services/users.js';

const r = Router();

async function resolveUserId(req) {
  if (req.query.telegramId) {
    const u = await findUserByTelegramId(req.query.telegramId);
    return u?.id;
  }
  return req.query.userId;
}

r.get('/', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId or telegramId required' });
    res.json(await listMeals(userId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post('/', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId or telegramId required' });
    const { name, calories, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const meal = await addMeal(userId, { name, calories, notes });
    res.json(meal);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.patch('/:id', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId or telegramId required' });
    const meal = await updateMeal(userId, req.params.id, req.body);
    if (!meal) return res.status(404).json({ error: 'not found' });
    res.json(meal);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.delete('/:id', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId or telegramId required' });
    const meal = await deleteMeal(userId, req.params.id);
    if (!meal) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default r;
