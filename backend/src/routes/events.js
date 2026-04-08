import { Router } from 'express';
import { logEvent, listRecentEvents } from '../services/events.js';

const r = Router();

r.post('/', async (req, res) => {
  try {
    const { userId, eventName, properties } = req.body;
    if (!eventName) return res.status(400).json({ error: 'eventName required' });
    const ev = await logEvent(userId, eventName, properties || {});
    res.json(ev);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.get('/', async (_req, res) => {
  try { res.json(await listRecentEvents(200)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

export default r;
