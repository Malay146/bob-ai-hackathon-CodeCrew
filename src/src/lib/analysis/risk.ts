import { prisma } from "@/lib/db";

import { zScore } from "./stats";
import type { SensorValues, SuspectSensorSummary } from "./types";

/**
 * 0-100 risk score for a batch that hasn't finished (or hasn't run) yet:
 * weighted average deviation from the healthy (pass) baseline across the
 * fab-wide suspect sensors, weighted by each sensor's historical
 * correlation with failure. This is the "flag upcoming batches whose
 * process parameters historically correlate with low yield" step.
 */
export function computeRiskScore(sensorValues: SensorValues, suspects: SuspectSensorSummary[]): number {
  let weightedSum = 0;
  let weightTotal = 0;

  for (const suspect of suspects) {
    const value = sensorValues[suspect.sensorKey];
    if (value === null || value === undefined || suspect.passMean === null || !suspect.stdDev) continue;

    const sigma = Math.abs(zScore(value, suspect.passMean, suspect.stdDev));
    const weight = Math.abs(suspect.correlation);
    weightedSum += weight * Math.min(sigma / 4, 1);
    weightTotal += weight;
  }

  if (weightTotal === 0) return 0;
  return Math.round((weightedSum / weightTotal) * 100);
}

export async function recomputeUpcomingBatchRisk(): Promise<number> {
  const suspects = await prisma.suspectSensor.findMany({ orderBy: { rank: "asc" } });
  const upcoming = await prisma.waferLot.findMany({ where: { role: "UPCOMING" } });

  await prisma.$transaction(
    upcoming.map((lot) =>
      prisma.waferLot.update({
        where: { id: lot.id },
        data: { riskScore: computeRiskScore(lot.sensorValues as SensorValues, suspects) },
      }),
    ),
  );

  return upcoming.length;
}
