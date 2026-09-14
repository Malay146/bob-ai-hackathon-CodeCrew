import { prisma } from "@/lib/db";

import { generateRecommendation } from "./recommendations";
import { mean, pairwiseValid, pointBiserialCorrelation, stdDev, zScore } from "./stats";
import type { RootCauseSummary, SensorValues, SuspectSensorSummary } from "./types";

const SUSPECT_POOL_SIZE = 25;
const FINDINGS_PER_LOT = 5;

/**
 * Fab-wide root cause candidates: correlate every sensor's readings against
 * FAIL outcomes across the historical lot population, rank by |correlation|.
 * This is the "rank root causes by probability" step, computed once and
 * cached in SuspectSensor rather than per-request.
 */
export async function computeSuspectSensors(): Promise<SuspectSensorSummary[]> {
  const lots = await prisma.waferLot.findMany({
    where: { role: "HISTORICAL" },
    select: { sensorValues: true, outcome: true },
  });
  if (lots.length === 0) return [];

  const sensorKeys = Object.keys(lots[0].sensorValues as SensorValues);
  const outcomeBinary = lots.map((lot) => (lot.outcome === "FAIL" ? 1 : 0));

  const summaries: SuspectSensorSummary[] = [];

  for (const sensorKey of sensorKeys) {
    const raw = lots.map((lot) => (lot.sensorValues as SensorValues)[sensorKey] ?? null);
    const { x, y } = pairwiseValid(raw, outcomeBinary);
    if (x.length < 10) continue;

    const correlation = pointBiserialCorrelation(x, y);

    const passValues: number[] = [];
    const failValues: number[] = [];
    for (let i = 0; i < x.length; i++) {
      (y[i] === 1 ? failValues : passValues).push(x[i]);
    }

    summaries.push({
      sensorKey,
      correlation,
      passMean: passValues.length ? mean(passValues) : null,
      failMean: failValues.length ? mean(failValues) : null,
      stdDev: passValues.length > 1 ? stdDev(passValues) : null,
      rank: 0,
    });
  }

  summaries.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  const top = summaries.slice(0, SUSPECT_POOL_SIZE).map((s, i) => ({ ...s, rank: i + 1 }));

  await prisma.$transaction(
    top.map((s) =>
      prisma.suspectSensor.upsert({
        where: { sensorKey: s.sensorKey },
        create: { ...s },
        update: { ...s },
      }),
    ),
  );

  return top;
}

export async function getSuspectSensors(): Promise<SuspectSensorSummary[]> {
  const cached = await prisma.suspectSensor.findMany({ orderBy: { rank: "asc" } });
  if (cached.length > 0) return cached;
  return computeSuspectSensors();
}

/**
 * Pure ranking step, shared by the cached per-lot path below and the ad-hoc
 * "check a new batch" flow: for a given set of sensor readings, how far does
 * each fab-wide suspect sensor deviate from the healthy (pass) baseline,
 * weighted by how strongly that sensor correlates with failure overall.
 */
export function rankRootCauses(sensorValues: SensorValues, suspects: SuspectSensorSummary[]): RootCauseSummary[] {
  const candidates: RootCauseSummary[] = [];
  for (const suspect of suspects) {
    const value = sensorValues[suspect.sensorKey];
    if (value === null || value === undefined || suspect.passMean === null || !suspect.stdDev) continue;

    const sigma = zScore(value, suspect.passMean, suspect.stdDev);
    const magnitude = Math.min(Math.abs(sigma) / 4, 1);
    const probability = 0.5 * Math.abs(suspect.correlation) + 0.5 * magnitude;

    candidates.push({
      sensorKey: suspect.sensorKey,
      probability,
      deviationSigma: sigma,
      direction: sigma >= 0 ? "HIGH" : "LOW",
      recommendation: generateRecommendation(suspect.sensorKey, sigma >= 0 ? "HIGH" : "LOW", sigma),
    });
  }

  candidates.sort((a, b) => b.probability - a.probability);
  return candidates.slice(0, FINDINGS_PER_LOT);
}

/**
 * Per-lot root cause ranking, cached in RootCauseFinding after first
 * computation.
 */
export async function computeLotRootCauses(lotId: string): Promise<RootCauseSummary[]> {
  const cached = await prisma.rootCauseFinding.findMany({
    where: { lotId },
    orderBy: { probability: "desc" },
  });
  if (cached.length > 0) {
    return cached.map((f) => ({
      sensorKey: f.sensorKey,
      probability: f.probability,
      deviationSigma: f.deviationSigma,
      direction: f.direction as "HIGH" | "LOW",
      recommendation: f.recommendation,
    }));
  }

  const lot = await prisma.waferLot.findUniqueOrThrow({ where: { id: lotId } });
  const suspects = await getSuspectSensors();
  const top = rankRootCauses(lot.sensorValues as SensorValues, suspects);

  if (top.length > 0) {
    await prisma.rootCauseFinding.createMany({
      data: top.map((f) => ({ lotId, ...f })),
    });
  }

  return top;
}
