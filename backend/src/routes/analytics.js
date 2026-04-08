import { Router } from 'express';
import { User, Meal, Event } from '../db.js';

const r = Router();

// Daily meal logs for last 7 days
r.get('/meals-daily', async (req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const meals = await Meal.find({ loggedAt: { $gte: since } });
  const buckets = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    buckets[d] = 0;
  }
  meals.forEach((m) => {
    const d = new Date(m.loggedAt).toISOString().slice(0, 10);
    if (d in buckets) buckets[d]++;
  });
  res.json(Object.entries(buckets).map(([date, count]) => ({ date, count })));
});

// A/B distribution
r.get('/ab-distribution', async (req, res) => {
  const control = await User.countDocuments({ experimentGroup: 'control' });
  const test = await User.countDocuments({ experimentGroup: 'test' });
  res.json([
    { group: 'control', users: control },
    { group: 'test', users: test },
  ]);
});

// Onboarding funnel for test group
r.get('/onboarding-funnel', async (req, res) => {
  const test = await User.find({ experimentGroup: 'test' });
  const total = test.length;
  const step1 = test.filter((u) => u.onboardingStep >= 1).length;
  const step2 = test.filter((u) => u.onboardingStep >= 2).length;
  const step3 = test.filter((u) => u.onboardingStep >= 3).length;
  const completed = test.filter((u) => u.onboardingCompleted).length;
  res.json([
    { stage: 'Started', users: total },
    { stage: 'Step 1', users: step1 },
    { stage: 'Step 2', users: step2 },
    { stage: 'Step 3', users: step3 },
    { stage: 'Completed', users: completed },
  ]);
});

// Summary metrics for evaluation
r.get('/summary', async (req, res) => {
  const totalUsers = await User.countDocuments();
  const blocked = await User.countDocuments({ blocked: true });
  const totalMeals = await Meal.countDocuments();
  const totalEvents = await Event.countDocuments();
  res.json({ totalUsers, blocked, totalMeals, totalEvents });
});

export default r;
