import { Event } from '../db.js';

export async function logEvent(userId, eventName, properties = {}) {
  return Event.create({ userId: userId || null, eventName, properties });
}
