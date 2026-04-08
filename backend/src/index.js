import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pingDB } from './db.js';
import { initExperiments } from './services/experiments.js';
import { startCronJobs } from './services/notifications.js';
import users from './routes/users.js';
import meals from './routes/meals.js';
import events from './routes/events.js';
import analytics from './routes/analytics.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api/users', users);
app.use('/api/meals', meals);
app.use('/api/events', events);
app.use('/api/analytics', analytics);

const PORT = process.env.PORT || 4000;

(async () => {
  await pingDB();
  await initExperiments();
  startCronJobs();
  app.listen(PORT, () => console.log(`[backend] listening on :${PORT}`));
})();
