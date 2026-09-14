#!/usr/bin/env node
// MCP server exposing WaferLens's wafer yield analysis as tools an agent
// (IBM Bob) can call. Same underlying logic that powers the dashboard's
// /api routes and its in-app assistant (../lib/assistant, ../lib/analysis)
// — this file is only the transport/tool-schema layer on top of it.
//
// Run standalone: `npm run mcp` (stdio transport). Point your Bob agent
// config at this command once you have Bob's actual config format —
// see docs/architecture.md for the current best-effort wiring.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { AT_RISK_THRESHOLD, getOverviewStats } from "../lib/analysis/overview";
import { computeLotRootCauses } from "../lib/analysis/root-cause";
import { answerAssistantMessage, explainLot, summarizeRisk } from "../lib/assistant";
import { prisma } from "../lib/db";

const server = new McpServer({ name: "waferlens", version: "0.1.0" });

server.tool(
  "get_fab_overview",
  "Fab-wide yield summary: historical pass/fail counts, yield %, top suspect sensor, and how many upcoming batches are currently flagged at risk.",
  {},
  async () => {
    const stats = await getOverviewStats();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(stats, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "get_lot_root_causes",
  "Ranked root causes (probability, sensor, deviation, recommended corrective action) for one wafer lot by its lot number.",
  { lotNumber: z.number().int().describe("The wafer lot number, e.g. 42") },
  async ({ lotNumber }) => {
    const lot = await prisma.waferLot.findUnique({ where: { lotNumber } });
    if (!lot) {
      return { content: [{ type: "text", text: `No wafer lot numbered ${lotNumber} found.` }] };
    }
    const findings = await computeLotRootCauses(lot.id);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ lotNumber, outcome: lot.outcome, findings }, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "list_at_risk_batches",
  `Upcoming wafer batches whose process parameters historically correlate with low yield (risk score >= ${AT_RISK_THRESHOLD}/100), ranked highest risk first.`,
  {},
  async () => {
    const atRisk = await prisma.waferLot.findMany({
      where: { role: "UPCOMING", riskScore: { gte: AT_RISK_THRESHOLD } },
      orderBy: { riskScore: "desc" },
      select: { lotNumber: true, riskScore: true },
    });
    return { content: [{ type: "text", text: JSON.stringify(atRisk, null, 2) }] };
  },
);

server.tool(
  "explain_lot",
  "Natural-language explanation of a wafer lot's likely root cause and recommended action, suitable for showing directly to a process engineer.",
  { lotNumber: z.number().int() },
  async ({ lotNumber }) => ({ content: [{ type: "text", text: await explainLot(lotNumber) }] }),
);

server.tool(
  "explain_risk",
  "Natural-language summary of currently at-risk upcoming batches and suggested next steps.",
  {},
  async () => ({ content: [{ type: "text", text: await summarizeRisk() }] }),
);

server.tool(
  "ask_bob",
  "Free-form question routed to the WaferLens assistant (mentions of a lot/batch number, 'risk'/'upcoming', or a general fab yield question are all handled).",
  { message: z.string() },
  async ({ message }) => ({ content: [{ type: "text", text: await answerAssistantMessage(message) }] }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("WaferLens MCP server failed to start:", err);
  process.exit(1);
});
