# n8n Workflow

This folder contains an importable n8n workflow that implements the Telegram A/B onboarding flow visually, satisfying the literal "build in n8n" wording of the spec.

## How it works
The workflow delegates A/B assignment + event logging to the **same backend** used by the Node bot, so there is one source of truth and no duplicate logic.

```
Telegram Trigger ─▶ /start? ─▶ POST /api/users (returns group from Statsig)
                                    │
                              ┌─────┴─────┐
                          control       test
                              │           │
                       Welcome msg    Step1 → wait → Step2 → wait → Step3
                                                                       │
                                                          POST /api/events (onboarding_completed)
```

## Import steps
1. Run n8n: `npx n8n` (or Docker)
2. In the UI: **Workflows → Import from File** → select `onboarding-ab-test.json`
3. Add Telegram credentials (paste the same `BOT_TOKEN`)
4. Set environment variable `BACKEND_URL=http://host.docker.internal:4000` (or your backend host)
5. **Important:** turn off the Node `bot/` process before activating the n8n workflow — both will fight for the same Telegram updates
6. Activate the workflow

## Why we kept the Node bot too
The Node bot in `bot/` implements the meal CRUD commands (`/log`, `/meals`, `/edit`, `/delete`) which are simpler to express as code than as a visual flow. You can either:
- Run only the Node bot (handles everything), **or**
- Run the n8n workflow for `/start` + onboarding and the Node bot for everything else (disable `/start` handler in `bot/src/index.js` if you do this)

Both share the same backend, so user state and A/B assignments stay consistent.
