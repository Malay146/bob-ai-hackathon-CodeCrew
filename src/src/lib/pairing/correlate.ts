import { correlationPValue, mean, pairwiseValid, pointBiserialCorrelation } from "@/lib/analysis/stats";
import type { SensorValues } from "@/lib/analysis/types";
import { prisma } from "@/lib/db";

import { DEFECT_PATTERNS } from "./patterns";

const TOP_SENSORS_PER_PATTERN = 5;
const MIN_WAFERS_PER_PATTERN = 8;
const MIN_PATTERN_READINGS = 8;
const ALPHA = 0.05;

export interface SensorLink {
  sensorKey: string;
  correlation: number;
  meanWithPattern: number;
  meanWithoutPattern: number;
  patternReadings: number;
  pValue: number;
  significant: boolean;
}

export interface PatternLinks {
  pattern: string;
  waferCount: number;
  sufficientData: boolean;
  links: SensorLink[];
}

export interface PairingAnalysis {
  totalWafers: number;
  sensorCount: number;
  simulatedCount: number;
  bonferroniThreshold: number;
  patterns: PatternLinks[];
}

/**
 * For each defect pattern, correlates every sensor against a one-vs-rest
 * "has this pattern" flag (point-biserial, same statistic used for
 * pass/fail elsewhere) and keeps the strongest sensors. With hundreds of
 * sensors tested per pattern some strong-looking correlations appear by
 * chance, so each result is also flagged against a Bonferroni-corrected
 * threshold (alpha / number of tests).
 */
export async function computePatternSensorLinks(): Promise<PairingAnalysis> {
  const wafers = await prisma.pairedWafer.findMany({
    select: { defectPattern: true, sensorValues: true, simulated: true },
  });

  const empty: PairingAnalysis = {
    totalWafers: 0,
    sensorCount: 0,
    simulatedCount: 0,
    bonferroniThreshold: ALPHA,
    patterns: [],
  };
  if (wafers.length === 0) return empty;

  const sensorKeys = Object.keys(wafers[0].sensorValues as SensorValues);
  const readings = wafers.map((w) => w.sensorValues as SensorValues);
  const bonferroniThreshold = ALPHA / (sensorKeys.length * DEFECT_PATTERNS.length);

  const patterns: PatternLinks[] = DEFECT_PATTERNS.map((pattern) => {
    const flags = wafers.map((w) => (w.defectPattern === pattern ? 1 : 0));
    const waferCount = flags.reduce<number>((sum, f) => sum + f, 0);
    if (waferCount < MIN_WAFERS_PER_PATTERN) {
      return { pattern, waferCount, sufficientData: false, links: [] };
    }

    const links: SensorLink[] = [];
    for (const sensorKey of sensorKeys) {
      const column = readings.map((r) => r[sensorKey] ?? null);
      const { x, y } = pairwiseValid(column, flags);
      if (x.length < 10) continue;

      const correlation = pointBiserialCorrelation(x, y);
      if (correlation === 0) continue;

      const withPattern = x.filter((_, i) => y[i] === 1);
      const without = x.filter((_, i) => y[i] === 0);
      // Mostly-missing sensors leave only a few real readings in the pattern group; their correlations are noise.
      if (withPattern.length < MIN_PATTERN_READINGS || without.length === 0) continue;

      const pValue = correlationPValue(correlation, x.length);
      links.push({
        sensorKey,
        correlation,
        meanWithPattern: mean(withPattern),
        meanWithoutPattern: mean(without),
        patternReadings: withPattern.length,
        pValue,
        significant: pValue < bonferroniThreshold,
      });
    }

    links.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    return { pattern, waferCount, sufficientData: true, links: links.slice(0, TOP_SENSORS_PER_PATTERN) };
  });

  return {
    totalWafers: wafers.length,
    sensorCount: sensorKeys.length,
    simulatedCount: wafers.filter((w) => w.simulated).length,
    bonferroniThreshold,
    patterns,
  };
}
