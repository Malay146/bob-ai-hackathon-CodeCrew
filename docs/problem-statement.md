# Problem Statement

## Background

Advanced semiconductor fabrication (3nm/5nm nodes) is one of the most instrumented manufacturing processes in existence — every wafer lot passes through hundreds of process steps, each monitored by dozens of equipment sensors. That instrumentation is meant to catch problems early, but in practice it produces more data than any engineer can manually reason about: a single lot can carry hundreds of sensor readings, and a fab runs thousands of lots.

## The Problem

When yield drops — more wafers failing than expected — process engineers have to manually cross-reference sensor logs, process parameters, and defect reports across potentially thousands of readings per lot to find which equipment step or parameter is responsible. This routinely takes **days to weeks** per investigation, because the correlation between "sensor X drifted" and "yield dropped" is buried in a volume of numeric data no person can eyeball. Worse, this is reactive: engineers find out a batch is bad *after* it has already run and consumed wafer, time, and equipment capacity.

## Who is Affected

Process and yield engineers at semiconductor fabs directly own this — they're the ones pulled into war-room investigations after a yield excursion, manually building spreadsheets of sensor readings to hunt for the culprit parameter. Fab management is affected indirectly: every day an investigation takes is a day of continued yield loss on whatever caused it, and every batch that runs without a risk check is a bet that could cost a full lot.

## Why It Matters

At 3nm/5nm nodes, a **1% yield drop costs tens of millions of dollars per month** — the problem statement's own framing. Root-cause investigations that take weeks mean weeks of that loss compounding before a fix is even identified, let alone applied. This isn't a hypothetical inefficiency; it's continuous, quantifiable revenue loss for as long as the root cause stays unknown.

## Why Existing Solutions Fall Short

Most fabs' existing tooling (SPC dashboards, per-sensor control charts) shows individual sensors drifting out of spec, but doesn't rank *which* of the hundreds of simultaneously-flagged sensors is actually driving the yield loss, doesn't turn that into a recommended corrective action, and doesn't look forward — it tells you a lot already failed, not that an upcoming batch's parameters resemble the profile of lots that historically failed. Closing that gap needs correlation analysis across the whole historical population plus a way to project current process parameters against that history *before* a batch runs, which is exactly what WaferLens does.
