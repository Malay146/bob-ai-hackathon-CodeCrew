// Shared reasoning engine: the same functions back both the in-app chat
// widget (app/api/assistant) and the MCP tools Bob calls (src/mcp/server.ts)
// so "ask Bob about lot 42" and "use the dashboard assistant" hit identical
// logic. Statistics come from lib/analysis; watsonx (if configured) turns
// the numbers into prose, otherwise a template does.

import { AT_RISK_THRESHOLD, getOverviewStats } from "@/lib/analysis/overview";
import { computeLotRootCauses } from "@/lib/analysis/root-cause";
import { prisma } from "@/lib/db";
import { generateNarrative } from "@/lib/watsonx";

async function narrate(fallback: string, prompt: string): Promise<string> {
  const generated = await generateNarrative(prompt);
  return generated ?? fallback;
}

export async function explainLot(lotNumber: number): Promise<string> {
  const lot = await prisma.waferLot.findUnique({ where: { lotNumber } });
  if (!lot) return `I don't have a wafer lot numbered ${lotNumber}.`;

  const findings = await computeLotRootCauses(lot.id);

  if (findings.length === 0) {
    return `Lot ${lotNumber} (${lot.outcome}) doesn't show a clear deviation on any fab-wide suspect sensor.`;
  }

  const bulletList = findings
    .map(
      (f, i) =>
        `${i + 1}. ${f.sensorKey} — ${(f.probability * 100).toFixed(0)}% probability, ${f.direction.toLowerCase()} (${f.deviationSigma.toFixed(1)}σ). ${f.recommendation}`,
    )
    .join("\n");

  const fallback = `Lot ${lotNumber} outcome: ${lot.outcome}.\n\n` + `Ranked root causes:\n${bulletList}`;

  const prompt =
    `You are a semiconductor process engineering assistant. Wafer lot ${lotNumber} outcome is ${lot.outcome}. ` +
    `Ranked suspect sensors with probability, deviation, and recommended action:\n${bulletList}\n\n` +
    `Write a concise (under 150 words) engineer-facing explanation of the likely root cause and what to do next.`;

  return narrate(fallback, prompt);
}

export async function summarizeRisk(): Promise<string> {
  const atRisk = await prisma.waferLot.findMany({
    where: { role: "UPCOMING", riskScore: { gte: AT_RISK_THRESHOLD } },
    orderBy: { riskScore: "desc" },
    take: 10,
  });

  if (atRisk.length === 0) {
    return "No upcoming batches currently cross the at-risk threshold.";
  }

  const bulletList = atRisk.map((lot) => `- Batch ${lot.lotNumber}: risk score ${lot.riskScore}/100`).join("\n");

  const fallback = `${atRisk.length} upcoming batch(es) flagged at or above ${AT_RISK_THRESHOLD}/100 risk:\n${bulletList}`;

  const prompt =
    `You are a semiconductor process engineering assistant. These upcoming wafer batches were flagged as ` +
    `at-risk because their process parameters resemble historical low-yield lots:\n${bulletList}\n\n` +
    `Write a concise (under 120 words) summary and suggested next step for the process engineer.`;

  return narrate(fallback, prompt);
}

export async function summarizeOverview(): Promise<string> {
  const stats = await getOverviewStats();
  const fallback =
    `Analysed ${stats.totalHistoricalLots} historical lots — yield ${stats.yieldPct.toFixed(1)}% ` +
    `(${stats.passCount} pass / ${stats.failCount} fail). ` +
    `${stats.topSuspectSensor ? `Top suspect sensor: ${stats.topSuspectSensor.sensorKey} (correlation ${stats.topSuspectSensor.correlation.toFixed(2)}).` : ""} ` +
    `${stats.atRiskBatchCount} of ${stats.upcomingBatchCount} upcoming batches are currently flagged at risk.`;
  return fallback;
}

const LOT_PATTERN = /(?:lot|batch)\s*#?(\d+)/i;

export async function answerAssistantMessage(message: string): Promise<string> {
  const lotMatch = message.match(LOT_PATTERN);
  if (lotMatch) {
    return explainLot(Number(lotMatch[1]));
  }
  if (/risk|upcoming|at.?risk/i.test(message)) {
    return summarizeRisk();
  }
  return summarizeOverview();
}
