import { Router } from 'express';
import { logEvent } from '../services/events.js';
import { Event } from '../db.js';

const r = Router();

r.post('/', async (req, res) => {
  const { userId, eventName, properties } = req.body;
  if (!eventName) return res.status(400).json({ error: 'eventName required' });
  const ev = await logEvent(userId, eventName, properties || {});
  res.json(ev);
});

r.get('/', async (req, res) => {
  const events = await Event.find().sort({ createdAt: -1 }).limit(200);
  res.json(events);
});

export default r;
