# 🚀 WaferLens

> Wafer Yield Root Cause & Defect Pattern Analyser — built for the Bob AI Innovation Hackathon

---

## 👥 Team

| Field | Value |
|---|---|
| **Team Name** | CodeCrew |
| **Track** | AI |
| **Team Lead** | Tirth Sorathia — 23dce116@charusat.edu.in |
| **Members** | Himpadma Patel, Dheyansh Patel, Malay Patel |

---

## 🎯 Problem Statement

At advanced semiconductor fab nodes (3nm/5nm), a 1% yield drop costs tens of millions of dollars per month. Process engineers spend weeks manually cross-referencing thousands of equipment sensor readings and process parameters per lot to find the root cause of a yield excursion, and have no way to know a batch is at risk until after it has already run.

---

## 💡 Solution

WaferLens analyses wafer lot sensor data to rank the equipment sensors most correlated with failure fab-wide, explains exactly how a given lot deviates from the healthy baseline on those sensors with a ranked, probability-scored root cause and recommended corrective action, and flags upcoming batches whose process parameters resemble historical low-yield lots before they run. The same analysis is exposed to an IBM Bob agent as MCP tools, so an engineer can ask "why did lot 42 fail?" in chat and get the identical, explainable answer the dashboard shows.

---

## ✨ Key Features

- **Fab-wide root cause ranking:** correlates every sensor's readings against failure outcomes across historical lots — no ML, fully explainable
- **Per-lot root cause detail:** ranked probable causes with deviation severity (σ) and a recommended corrective action for each
- **Upcoming batch risk scoring:** 0-100 risk score for batches that haven't run yet, with a retrospective accuracy check against real outcomes on the Risk Watch page
- **Defect pattern image classification:** a custom CNN (trained from scratch on WM-811K, not a transfer-learning model — wafer maps are categorical die-state grids, not photographic images) classifies wafer defect maps into 8 known failure patterns at 88.3% test accuracy, each with a ranked cause and recommended corrective action. Inference runs entirely in the browser via TensorFlow.js, with no server round-trip.
- **IBM Bob integration:** MCP server exposing 7 tools (`get_fab_overview`, `get_lot_root_causes`, `list_at_risk_batches`, `explain_lot`, `explain_risk`, `ask_bob`, `classify_defect_image`) backed by the exact same analysis engine as the dashboard
- **Check a Batch:** paste raw sensor readings (or load a real upcoming batch) and get an instant risk score + findings, no seeding required
- **Import Dataset:** upload a new SECOM-format dataset from the dashboard and re-run the full analysis, or use the equivalent CLI script

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | TypeScript |
| **Frameworks** | Next.js 16, React 19, Prisma |
| **IBM Technologies** | IBM Bob (via MCP server), watsonx.ai (optional narration) |
| **Databases** | PostgreSQL |
| **Other** | shadcn/ui, Tailwind CSS, Recharts, TensorFlow.js |

---

## 📁 Repository Structure

```
├── src/                  # All source code (Next.js app, analysis engine, MCP server)
├── docs/                 # Written documentation
│   ├── problem-statement.md
│   ├── solution-overview.md
│   ├── architecture.md
│   └── setup-guide.md
├── demo/                 # Demo artifacts
│   ├── screenshots/      # App screenshots
│   └── demo-video-link.txt  # Link to demo video
├── presentation/         # Slide deck
└── submission.yaml       # Structured submission metadata
```

---

## ⚡ How to Run

Full details in [`docs/setup-guide.md`](docs/setup-guide.md). Short version:

```bash
cd src
cp .env.example .env      # set DATABASE_URL to your Postgres instance
npm install
npm run db:push
npm run import:secom      # seeds from the committed UCI SECOM dataset
npm run dev
```

Open `http://localhost:3000`.

---

## 🖥️ Demo

| Artifact | Link |
|---|---|
| 📹 Demo Video | [See demo/demo-video-link.txt](demo/demo-video-link.txt) |
| 🌐 Live Demo | [See demo/live-demo-url.txt](demo/live-demo-url.txt) |
| 🖼️ Screenshots | [See demo/screenshots/](demo/screenshots/) |
| 📊 Presentation | [See presentation/slides.pdf](presentation/) |

---

## ⚠️ Known Limitations


- **IBM Bob's exact CLI/config format** was not available during development. The MCP server is built against the standard Model Context Protocol SDK and ready to connect once that spec is available.
- **No authentication** — this is a single-engineer demo tool, not multi-tenant.
- Root-cause/risk statistics are computed in application memory rather than SQL-side, which is fine at this dataset's scale (1567 lots × 590 sensors) but would need to change for a much larger, continuously-running fab.

---

## 🏅 What We're Most Proud Of

The root cause and risk-prediction engine is built entirely from plain, explainable statistics (point-biserial correlation, z-score deviation) rather than a trained model — every ranked cause and every risk score can be traced back to a specific sensor's correlation and this lot's exact deviation from the healthy baseline. That same engine is genuinely load-bearing for IBM Bob: the MCP server calls the identical functions the dashboard uses, so Bob's answers and the dashboard's numbers can never drift apart.

---
