import { Router } from 'express';
import { addMeal, listMeals, updateMeal, deleteMeal } from '../services/meals.js';
import { User } from '../db.js';

const r = Router();

// Resolve userId from either Mongo _id or telegramId via query
async function resolveUserId(req) {
  if (req.query.telegramId) {
    const u = await User.findOne({ telegramId: String(req.query.telegramId) });
    return u?._id;
  }
  return req.query.userId;
}

r.get('/', async (req, res) => {
  const userId = await resolveUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId or telegramId required' });
  res.json(await listMeals(userId));
});

r.post('/', async (req, res) => {
  const userId = await resolveUserId(req);
  if (!userId) return res.status(400).json({ error: 'userId or telegramId required' });
  const { name, calories, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const meal = await addMeal(userId, { name, calories, notes });
  res.json(meal);
});

r.patch('/:id', async (req, res) => {
  const userId = await resolveUserId(req);
  const meal = await updateMeal(userId, req.params.id, req.body);
  if (!meal) return res.status(404).json({ error: 'not found' });
  res.json(meal);
});

r.delete('/:id', async (req, res) => {
  const userId = await resolveUserId(req);
  const meal = await deleteMeal(userId, req.params.id);
  if (!meal) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

export default r;
