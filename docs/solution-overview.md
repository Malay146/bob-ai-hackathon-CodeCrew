# Solution Overview

## What We Built

**WaferLens** analyses wafer lot sensor/process-parameter data to figure out *why* wafers are failing and *which upcoming batches are likely to fail before they even run*. Instead of an engineer manually cross-referencing thousands of sensor readings across weeks of lots, WaferLens ranks the sensors most correlated with failure fab-wide, shows exactly how far a given lot's readings deviate from the healthy baseline on those sensors, and turns that into plain-language root causes and recommended corrective actions. The same analysis is exposed to an IBM Bob agent as callable tools, so an engineer can also just ask "why did lot 42 fail?" in chat and get the same answer.

Because the team doesn't have an ML background, the "intelligence" here is deliberately built from **plain statistics** (correlation, z-score, weighted deviation) rather than trained models — no black box, every number is explainable, and it still directly answers the problem statement's four asks: identify patterns, rank root causes by probability, recommend corrective actions, and flag at-risk upcoming batches.

## How It Works

1. Wafer lot data (sensor readings + pass/fail outcome) is loaded into Postgres — either from the committed UCI SECOM dataset via a seed script, or uploaded through the dashboard's Import Dataset page.
2. For every sensor, WaferLens computes its **correlation with FAIL outcomes** across all historical lots (point-biserial correlation) and ranks the top ~25 "fab-wide suspect sensors" — this is the "identify patterns" step.
3. For a specific lot, WaferLens takes those suspect sensors and computes how many **standard deviations** that lot's reading is from the healthy (pass-lot) baseline on each one. Combining that deviation with the sensor's overall correlation strength produces a **root-cause probability ranking** for that lot, each with a templated corrective action (e.g. "recalibrate the equipment station feeding this sensor").
4. The same weighted-deviation math, run against a batch that hasn't finished (or hasn't even run) yet, produces a **0–100 risk score** — flagging batches whose process parameters resemble the historical low-yield population before their outcome is known.
5. All of the above is exposed two ways: as Next.js server components/API routes powering the dashboard, and as **MCP tools** (`get_fab_overview`, `get_lot_root_causes`, `list_at_risk_batches`, `explain_lot`, `explain_risk`, `ask_bob`) that an IBM Bob agent calls directly — so asking Bob "why is lot 12 at risk?" runs the exact same computation as the dashboard.
6. An optional IBM watsonx.ai call turns the raw ranked-findings JSON into a natural-language explanation; if no watsonx credentials are configured, a clear templated summary is used instead, so the app is fully functional with or without it.

## Architecture Diagram

> See [`architecture.md`](architecture.md) for the detailed diagram.

```
[Engineer / Bob chat] → [Next.js dashboard + API routes] ─┬→ [Postgres: lots, suspect sensors, findings]
                                                            └→ [watsonx.ai narration] (optional)
[IBM Bob agent] → [MCP server] → [same analysis library] ──┘
```

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Plain statistics (correlation + z-score) instead of ML | Team has no ML background; every score is explainable from first principles, and the SECOM dataset's weak/anonymized signal wouldn't benefit much from a trained model anyway |
| One shared analysis library powers both the dashboard and the MCP tools | "Ask Bob" and clicking through the dashboard must give identical answers — no duplicated logic that could drift |
| Upcoming batches simulated by holding back every 7th historical lot's outcome | The real dataset has no true "future" batches; this lets the risk-prediction claim be checked retrospectively (shown on the Risk Watch page) rather than taken on faith |
| Dataset import available both as a CLI script and a dashboard upload page | The CLI is the reliable path for seeding; the UI page makes the same pipeline demoable and operable without a terminal |
| watsonx.ai narration is optional with a templated fallback | The app must fully work in a judge's environment with zero IBM credentials configured |

## IBM Technologies Used

- **IBM Bob (MCP integration):** `src/mcp/server.ts` runs an MCP server exposing six tools backed by the analysis engine (`get_fab_overview`, `get_lot_root_causes`, `list_at_risk_batches`, `explain_lot`, `explain_risk`, `ask_bob`). Bob calls these directly to answer engineer questions in chat, rather than Bob being a bolt-on chat widget over static text.
- **watsonx.ai:** `src/lib/watsonx.ts` exchanges the `WATSONX_API_KEY` for an IAM token and calls the `ibm/granite-3-8b-instruct` text-generation endpoint, turning the computed root-cause/risk JSON into a concise engineer-facing explanation. Used by both the dashboard's "Ask Bob" chat and the MCP `explain_lot`/`explain_risk` tools; falls back to a clear templated summary when no credentials are set.

## Two Complementary Analysis Paths

WaferLens now combines two parallel, complementary approaches to wafer failure analysis:

### 1. Sensor Statistics (SECOM dataset — tabular)
Root-cause ranking, risk scoring, and corrective-action recommendations driven by plain statistics (point-biserial correlation, z-score deviation) over 590 sensor/process-parameter readings per lot. Fully server-side: data lives in PostgreSQL, computations run in Next.js server components and API routes, and the same functions are exposed as 6 MCP tools for IBM Bob.

### 2. Defect-Pattern Image Classification (WM-811K dataset — CNN)
A custom CNN trained from scratch on the WM-811K wafer-map dataset (not a transfer-learning model — wafer maps are categorical die-state grids, not photographic RGB, so ImageNet features do not transfer) classifies a 40×40 wafer defect map into one of 8 known failure patterns: Center, Donut, Edge-Loc, Edge-Ring, Loc, Near-full, Random, Scratch. Inference runs entirely in the browser via TensorFlow.js with no server round-trip — the model weights (~450 KB) are served as static assets and loaded once per browser session. The seventh MCP tool (`classify_defect_image`) replicates the same inference server-side using `pngjs` and a custom TF.js filesystem IO handler, so IBM Bob can classify a defect map without any browser or canvas dependency.

Both paths surface through the same dashboard and both are exposed to IBM Bob via the MCP server, giving engineers a unified interface for sensor-level root-cause analysis and visual defect-pattern identification.
