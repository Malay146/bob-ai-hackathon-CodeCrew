# Setup Guide

> **This file is read by the automated evaluation pipeline. Be precise and complete.**

## Prerequisites

- [ ] Node.js 20+ and npm
- [ ] A PostgreSQL 14+ database — local (Postgres.app, Homebrew, Docker) or hosted (Neon, Supabase, Railway all have free tiers)
- [ ] Git

IBM watsonx.ai is **optional** — the app is fully functional without it (see below).

## Environment Variables

All source code lives in [`src/`](../src/). Copy its `.env.example` to `.env` and fill in the values:

```bash
cd src
cp .env.example .env
```

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/waferlens` | Yes |
| `WATSONX_API_KEY` | IBM watsonx.ai API key | No — narration falls back to a templated summary without it |
| `WATSONX_PROJECT_ID` | IBM watsonx.ai project ID | No |
| `WATSONX_URL` | watsonx.ai region endpoint (default `https://us-south.ml.cloud.ibm.com`) | No |

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/Malay146/bob-ai-hackathon-CodeCrew.git
cd bob-ai-hackathon-CodeCrew/src

# 2. Install dependencies (also runs `prisma generate`)
npm install

# 3. Create the database schema
npm run db:push

# 4. Seed the database from the committed UCI SECOM dataset
#    (parses data-raw/secom.data + secom_labels.data, ~1567 lots,
#    then computes fab-wide correlations and upcoming-batch risk)
npm run import:secom
```

## Running the Application

```bash
npm run dev
```

The dashboard will be available at: `http://localhost:3000` (redirects to `/dashboard/default`).

Optional — run the MCP server that exposes the analysis to an IBM Bob agent as tools:

```bash
npm run mcp
```

## Verifying It's Working

After `npm run import:secom` and `npm run dev`:

1. Open `http://localhost:3000/dashboard/default` — you should see yield around **93%**, 1344 historical lots, and a top suspect sensor (e.g. `S_60`).
2. Open `http://localhost:3000/dashboard/lots`, click into any lot — you should see ranked root causes with recommended actions.
3. Open `http://localhost:3000/dashboard/check`, click "Try a real upcoming batch", then "Analyze" — you should get a risk score and findings without any manual data entry.
4. Open `http://localhost:3000/dashboard/assistant` and ask "why did lot 5 fail?" — you should get a natural-language answer generated from the same analysis.

## Running Tests

No automated test suite is included in this submission — verification was done manually against the running app (see above) plus `npm run build` and `npx biome check` for type/lint correctness.

```bash
npm run build   # production build + type check
npx biome check src scripts   # lint
```

## Troubleshooting

| Issue | Solution |
|---|---|
| `Can't reach database server` | Confirm Postgres is running and `DATABASE_URL` in `.env` matches its host/port/credentials |
| `npm run import:secom` fails with a row-count or column-count error | The `data-raw/secom.data` / `secom_labels.data` files are committed in the repo — don't substitute other files unless they're in the same SECOM format |
| Dashboard shows "No suspect sensors computed yet" | Run `npm run import:secom` — it seeds data and computes the correlation analysis in one step |
| watsonx-related fields are empty in `.env` | Expected — the app falls back to templated explanations automatically, no error |
| Prisma Client type errors after pulling new schema changes | Run `npx prisma generate` (also runs automatically on `npm install` via the `postinstall` script) |
