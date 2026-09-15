# Slide content draft

Not a substitute for `slides.pdf`/`.pptx` — paste this into your deck tool of choice (Google Slides, PowerPoint, Keynote). Screenshots referenced are in [`../demo/screenshots/`](../demo/screenshots/).

---

## Slide 1 — Title

**WaferLens**
Wafer Yield Root Cause & Defect Pattern Analyser
Team CodeCrew · Track: AI · Bob AI Innovation Hackathon

---

## Slide 2 — Problem

- At 3nm/5nm fab nodes, a **1% yield drop costs tens of millions/month**
- Root causes hide across thousands of sensor readings per lot — engineers spend **weeks** finding them manually
- No way to know a batch is at risk until **after** it has already run

---

## Slide 3 — Solution

WaferLens ranks the sensors most correlated with failure fab-wide, explains exactly how a lot deviates from the healthy baseline with a **ranked, probability-scored root cause + recommended action**, and **flags upcoming batches at risk before they run**.

*(Use screenshot: `01-overview.png`)*

---

## Slide 4 — Architecture

One shared analysis library (plain statistics — correlation + z-score, no ML) powers both:
- The Next.js dashboard
- An MCP server IBM Bob calls directly

*(Use the mermaid diagram from `docs/architecture.md`, or screenshot it)*

---

## Slide 5 — Demo / Key Feature

Walk through:
1. A failed lot's ranked root causes (`03-lot-detail.png`)
2. Risk Watch flagging an upcoming batch, with retrospective accuracy (`04-risk-watch.png`)
3. Check a Batch — paste readings, get an instant risk score (`05-check-batch.png`)

---

## Slide 6 — IBM Technologies

- **IBM Bob (MCP):** 6 tools (`get_fab_overview`, `get_lot_root_causes`, `list_at_risk_batches`, `explain_lot`, `explain_risk`, `ask_bob`) call the exact same analysis functions the dashboard uses — not a decorative chat layer
- **watsonx.ai:** optional narration layer, turns computed findings into natural language (`06-ask-bob.png`), falls back cleanly without credentials

---

## Slide 7 — Results / Impact

- 1567 real wafer lots analysed (UCI SECOM), 93.2% yield, fab-wide suspect sensors ranked
- 223 simulated upcoming batches scored for risk, with retrospective accuracy shown live on Risk Watch
- Fully explainable — every score traces back to a specific sensor's correlation and this lot's deviation, no black box

---

## Slide 8 — Team & Limitations

- Team CodeCrew: Tirth Sorathia (lead), Himpadma Patel, Dheyansh Patel, Malay Patel
- Known limitations: defect-pattern image analysis (needs a different, image-based dataset) and IBM Bob's real CLI config (organizer spec pending — MCP server ready)
