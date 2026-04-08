import { Router } from 'express';
import { supabase, toCamel } from '../db.js';

const r = Router();

// Daily meal logs for last 7 days
r.get('/meals-daily', async (_req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from('meals')
      .select('logged_at')
      .gte('logged_at', since.toISOString());
    if (error) throw error;

    const buckets = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      buckets[d] = 0;
    }
    data.forEach((m) => {
      const d = new Date(m.logged_at).toISOString().slice(0, 10);
      if (d in buckets) buckets[d]++;
    });
    res.json(Object.entries(buckets).map(([date, count]) => ({ date, count })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// A/B distribution
r.get('/ab-distribution', async (_req, res) => {
  try {
    const { count: control } = await supabase
      .from('users').select('id', { count: 'exact', head: true })
      .eq('experiment_group', 'control');
    const { count: test } = await supabase
      .from('users').select('id', { count: 'exact', head: true })
      .eq('experiment_group', 'test');
    res.json([
      { group: 'control', users: control || 0 },
      { group: 'test', users: test || 0 },
    ]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Onboarding funnel for test group
r.get('/onboarding-funnel', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('onboarding_step, onboarding_completed')
      .eq('experiment_group', 'test');
    if (error) throw error;
    const total = data.length;
    const step1 = data.filter((u) => u.onboarding_step >= 1).length;
    const step2 = data.filter((u) => u.onboarding_step >= 2).length;
    const step3 = data.filter((u) => u.onboarding_step >= 3).length;
    const completed = data.filter((u) => u.onboarding_completed).length;
    res.json([
      { stage: 'Started', users: total },
      { stage: 'Step 1', users: step1 },
      { stage: 'Step 2', users: step2 },
      { stage: 'Step 3', users: step3 },
      { stage: 'Completed', users: completed },
    ]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Summary metrics
r.get('/summary', async (_req, res) => {
  try {
    const [{ count: totalUsers }, { count: blocked }, { count: totalMeals }, { count: totalEvents }] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('blocked', true),
      supabase.from('meals').select('id', { count: 'exact', head: true }),
      supabase.from('events').select('id', { count: 'exact', head: true }),
    ]);
    res.json({
      totalUsers: totalUsers || 0,
      blocked: blocked || 0,
      totalMeals: totalMeals || 0,
      totalEvents: totalEvents || 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default r;
