# CalorAI — Telegram Health Bot + A/B Test + Dashboard + Mobile

A unified system: **one Node.js backend** powers a Telegram bot, a React analytics dashboard, and an Expo mobile app. Single source of truth in **Supabase (Postgres)**.

## What's included

| Component | Path | Description |
|---|---|---|
| Backend API | `backend/` | Express + Supabase (`@supabase/supabase-js`). Users, meals, events, A/B engine, analytics endpoints |
| Telegram bot | `bot/` | Telegraf bot. `/start` → A/B assignment, 3-step onboarding (test) or generic msg (control). Meal CRUD commands |
| Dashboard | `dashboard/` | React + Vite + Recharts. Live meal logs, A/B distribution, onboarding funnel |
| Mobile app | `mobile/` | Expo / React Native. Meal CRUD synced with bot in near real-time + push notifications |
| n8n workflow | `n8n/` | Importable n8n flow for the A/B onboarding (calls same backend) |
| Evaluation plan | `EVALUATION_PLAN.md` | Hypothesis, primary/guardrail/secondary metrics, decision framework |

## Architecture

```
┌──────────────┐    ┌────────────────────┐    ┌──────────────┐
│ Telegram Bot │───▶│  Express Backend   │◀───│  Dashboard   │
│ (Telegraf)   │    │  + supabase-js     │    │  (React)     │
└──────────────┘    │  + A/B engine      │    └──────────────┘
                    │  + Event log       │    ┌──────────────┐
                    │       │            │◀───│ Mobile (Expo)│
                    │       ▼            │    └──────────────┘
                    │ Supabase (Postgres)│
                    └────────────────────┘
```

All clients (bot, web, mobile) use the **same REST API**. No duplicate logic, no duplicate data layer.

## Tools used (and why)

- **Node.js + Express** — minimal, fast, ubiquitous backend
- **Supabase (Postgres) + `@supabase/supabase-js`** — managed Postgres with a generous free tier; the SDK is light, type-safe-ish, and removes the need to run a local DB
- **Telegraf** — most popular Telegram bot framework for Node
- **Statsig (`statsig-node`) with internal fallback** — if `STATSIG_SERVER_KEY` is set, real Statsig SDK assigns groups via `getExperimentSync`; otherwise an internal deterministic SHA-256 bucketer (same interface) takes over so the system runs offline
- **expo-server-sdk + node-cron** — daily reminder + daily summary push notifications
- **Vite + React + Recharts** — fast dev server, simple charts
- **Expo (React Native)** — fastest path to a real device build via Expo Go

## Prerequisites

- Node.js 18+
- A Supabase project (free tier — https://supabase.com). You'll need the **Project URL** and the **publishable / anon key**.
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

## Setup

### 1. Supabase schema (one-time)

You have **two options** — pick whichever you prefer:

**Option A: automated (recommended)**
```bash
cd backend
cp .env.example .env
# edit .env: set SUPABASE_URL, SUPABASE_KEY, and SUPABASE_DB_URL (with your DB password)
npm install
npm run migrate
```
The migration runner connects via `pg`, walks `backend/migrations/`, and runs each `.sql` file in order. It's idempotent — safe to re-run.

**Option B: manual via the Supabase UI**
1. Open your Supabase project → **SQL Editor → New query**
2. Paste the contents of `backend/migrations/001_init.sql`
3. Click **Run**

Either way creates 3 tables (`users`, `meals`, `events`) with indexes and disables RLS so the backend (a trusted server-side intermediary) can read/write with the publishable key.

### 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set SUPABASE_URL and SUPABASE_KEY from your Supabase project settings
npm install
npm start
```
Backend runs at `http://localhost:4000`. Test with `curl http://localhost:4000/health`.

### 3. Telegram bot

```bash
cd ../bot
cp .env.example .env
# edit .env: set BOT_TOKEN from BotFather
npm install
npm start
```
Now open Telegram, find your bot, and send `/start`.

### 4. Dashboard

```bash
cd ../dashboard
npm install
npm run dev
```
Open `http://localhost:5173`. Auto-refreshes every 5s.

### 5. Mobile app (Expo)

```bash
cd ../mobile
npm install
npm start
```
- Edit `mobile/App.js`: set `BACKEND_URL` to your computer's LAN IP (e.g. `http://192.168.1.10:4000`) so your phone can reach it
- Set `TELEGRAM_ID` to your Telegram numeric user ID (the same one that talks to the bot)
- Scan QR code with Expo Go app

## Environment variables

**backend/.env**
```
PORT=4000
SUPABASE_URL=https://xxxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxx
SUPABASE_DB_URL=postgresql://postgres:YOUR-PASSWORD@db.xxxxxxxxxxxxxx.supabase.co:5432/postgres
STATSIG_SERVER_KEY=          # optional: real Statsig key. blank = internal bucketing
DAILY_REMINDER_CRON=0 19 * * *
DAILY_SUMMARY_CRON=0 21 * * *
```
> `SUPABASE_DB_URL` is only needed for `npm run migrate`. The running backend uses `SUPABASE_URL` + `SUPABASE_KEY` (REST API) for everything else.

**bot/.env**
```
BOT_TOKEN=123456:ABC-from-BotFather
BACKEND_URL=http://localhost:4000
```

## Bot commands

| Command | What it does |
|---|---|
| `/start` | Assigns A/B group; control gets welcome msg, test gets 3-step flow |
| `/log <meal> [calories]` | Log a meal, e.g. `/log Chicken salad 450` |
| `/meals` | List your meals (with IDs) |
| `/edit <id> <new name> [calories]` | Edit a meal |
| `/delete <id>` | Delete a meal |
| `/myid` | Reveals your Telegram ID — paste this into `mobile/App.js` to sync the mobile app |
| `/help` | Show commands |

## Key API endpoints

```
POST   /api/users                     upsert user, returns A/B group
PATCH  /api/users/:id/onboarding      update step
GET    /api/meals?telegramId=<id>     list meals
POST   /api/meals?telegramId=<id>     add meal
PATCH  /api/meals/:id                 update
DELETE /api/meals/:id                 delete
POST   /api/events                    log event
GET    /api/analytics/meals-daily     7-day chart data
GET    /api/analytics/ab-distribution group counts
GET    /api/analytics/onboarding-funnel
GET    /api/analytics/summary         high-level KPIs
```

## A/B testing

- 50/50 deterministic SHA-256 bucketing on Telegram user ID
- Persisted on user record (`experimentGroup`)
- Exposure logged as `experiment_exposure` event
- Same user → same group, always
- See `EVALUATION_PLAN.md` for the full evaluation framework

## Trade-offs & assumptions

- **Statsig with internal fallback.** Real `statsig-node` SDK is wired in; if no key is provided, deterministic SHA-256 bucketing takes over so the system always runs. This makes the demo reproducible without depending on the Statsig dashboard configuration.
- **n8n workflow provided as an importable JSON** in `n8n/` since the spec wording says "build in n8n". The Node bot is the primary implementation because meal CRUD is cleaner in code; the n8n workflow handles the A/B onboarding flow visually and calls the same backend.
- **Polling instead of WebSockets** for mobile/dashboard live sync. Reason: simpler, sufficient for this scope. A production system could use Supabase Realtime channels (built into Postgres logical replication) for true push.
- **No auth on the API.** Reason: scope. The bot is the trust boundary (verified by Telegram). For production, add JWT or API keys for the dashboard/mobile.
- **Supabase (Postgres) instead of MongoDB** — managed, free tier, proper relational schema, and the publishable key + RLS-off pattern lets the trusted backend talk to it without managing a service-role secret. Schema lives in `backend/migrations/001_init.sql`.
- **Push notifications** are wired end-to-end via `expo-server-sdk` + `node-cron`. The mobile app registers an Expo push token on launch, the backend stores it on the user, and two cron jobs send a daily reminder and a daily summary. Manual triggers exist at `POST /api/users/_test/send-reminders` and `/_test/send-summaries` for demoing in the walkthrough video without waiting for the cron.

## Time breakdown (approximate)

| Section | Time |
|---|---|
| Architecture & planning | 15 min |
| Backend (DB, services, routes, analytics) | 50 min |
| Telegram bot + onboarding + meal commands | 35 min |
| Dashboard | 25 min |
| Expo mobile app | 25 min |
| Evaluation plan + README | 20 min |
| **Total** | **~3 hours** |

## What I'd add with more time

1. Real Statsig SDK integration (5-line swap)
2. Supabase Realtime channels → push updates to dashboard/mobile without polling
3. Expo push notifications + daily reminder cron
4. Auth on REST API (JWT)
5. Statistical significance calculator built into the dashboard
6. Dockerfile + docker-compose for one-command bring-up
