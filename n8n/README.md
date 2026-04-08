# n8n Workflow — CalorAI A/B Onboarding

This folder contains an importable n8n workflow that implements the **Telegram A/B onboarding flow** visually, satisfying the literal "build in n8n" wording of the spec.

The workflow delegates A/B group assignment + event logging to the **same backend** the Node bot uses, so there's still one source of truth and zero duplicate logic.

## Flow diagram

```
Telegram Trigger
       │
       ▼
   Is /start? ──no──▶ end
       │ yes
       ▼
Upsert User (POST http://localhost:4000/api/users)
       │  ← backend assigns A/B group via Statsig and returns it
       ▼
    Group?
    ╱     ╲
control   test
   │        │
   ▼        ▼
Welcome   Step 1 → Wait 2s → Step 2 → Wait 2s → Step 3
              │
              ▼
       Log onboarding_completed (POST /api/events)
```

## Setup (everything runs on localhost)

### 1. Make sure the backend is running

```bash
cd backend
npm start
```
Verify: `curl http://localhost:4000/health` → `{"ok":true}`

### 2. Stop the Node bot if it's running

```bash
# in the bot/ terminal
Ctrl+C
```

> ⚠️ **Important:** Telegram only allows ONE poller per bot token at a time. If you leave the Node bot running while you activate this workflow, neither will work.

### 3. Run n8n locally

```bash
npx n8n
# opens http://localhost:5678
```

### 4. Import the workflow

In the n8n UI:
1. **Workflows → Import from File**
2. Select `calorai/n8n/onboarding-ab-test.json`
3. Click **Import**

You'll see a 12-node workflow with a sticky-note "📌 README" in the top-left.

### 5. Add the Telegram credential

1. Click any **Telegram** node (e.g. *Send Control Message*)
2. Under **Credential to connect with**, click **Create New**
3. Name it: `Telegram account`
4. Paste your bot token in the **Access Token** field:
   ```
   8496575972:AAGHKQ8Uc7OLiAz3_qO2I3FIdfiwu7Vjfp0
   ```
5. Click **Save**

The credential is automatically reused by all 4 Telegram nodes in the workflow because they reference it by name.

### 6. Activate the workflow

Toggle the **Inactive → Active** switch in the top-right of the workflow editor. n8n will start long-polling Telegram for new messages.

### 7. Test it

In Telegram, find your bot and send `/start`. You should see either:
- **Control:** *"Hi! Welcome to CalorAI…"* (one message, end)
- **Test:** Three messages with 2-second delays between them

Open the **Executions** tab in n8n to watch each node light up in real time.

## What each node does

| Node | What it does |
|---|---|
| 📌 **README sticky note** | On-canvas setup instructions (just a comment) |
| **Telegram Trigger** | Long-polls Telegram via your bot token. Fires whenever ANY message is received |
| **Is /start** | IF node — branches based on whether `message.text === '/start'`. Other messages are ignored |
| **Upsert User (Backend → Statsig)** | `POST http://localhost:4000/api/users` with `{telegramId, username, firstName}`. The backend creates the user if missing, assigns them to control/test via Statsig (or the SHA-256 fallback), and returns the group |
| **Group?** | IF node — branches based on whether `group === 'control'` |
| **Send Control Message** | Telegram sendMessage — one-line welcome (control branch ends here) |
| **Onboarding Step 1** | Telegram sendMessage — first message of the test flow |
| **Wait 2s** | 2-second delay between messages so they don't all arrive instantly |
| **Onboarding Step 2** | Telegram sendMessage — second step |
| **Wait 2s (2)** | Another 2-second delay |
| **Onboarding Step 3** | Telegram sendMessage — final step |
| **Log onboarding_completed** | `POST http://localhost:4000/api/events` to record that this user finished the onboarding flow. Powers the funnel chart in the dashboard |

## Why we have BOTH the Node bot AND this workflow

| Concern | Where it lives |
|---|---|
| `/start` + A/B onboarding | This n8n workflow **OR** `bot/src/index.js` — both work, both call the same backend |
| `/log`, `/meals`, `/edit`, `/delete` | `bot/src/index.js` only — meal CRUD parsing is much cleaner in code than as visual nodes |
| A/B engine, persistence, analytics | `backend/` (called by both) |

For the live demo we recommend running **the Node bot** (handles everything) and just **opening this workflow in the n8n UI** for ~30 seconds in the walkthrough video to show the visual implementation exists.

If you want to run the n8n workflow live instead, **stop the Node bot first** (Telegram allows only one poller per token).

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Conflict: terminated by other getUpdates request" | The Node bot is also polling. Stop it (`Ctrl+C` in `bot/` terminal) before activating the n8n workflow |
| HTTP nodes return `ECONNREFUSED 127.0.0.1:4000` | Backend isn't running. Start it: `cd backend && npm start` |
| Workflow runs but no Telegram message arrives | Bot token is wrong or you haven't started a chat with your bot. Open Telegram, find your bot, click Start once |
| Both branches of "Group?" trigger | Telegram sent the message twice (you tapped /start twice quickly). Normal — n8n processes each independently |
