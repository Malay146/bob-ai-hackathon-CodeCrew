// SIMULATED data only. No public dataset pairs wafer maps with sensor readings
// for the same wafers (WM-811K has no sensors; SECOM has no wafer IDs), so
// this generates one so the sensor <-> defect-pattern analysis has something
// to run on. Sensor distributions come from real SECOM pass lots; the link to
// each defect pattern is *planted* (a few sensors shifted for wafers with
// that pattern). Finding the planted links proves the mechanism works — it
// says nothing about real fabs. Replace with a real paired CSV via the import.

import type { SensorValues } from "@/lib/analysis/types";
import { prisma } from "@/lib/db";

import { importPairedRows, type PairedImportSummary, type PairedRow } from "./import";
import { DEFECT_PATTERNS, NO_DEFECT } from "./patterns";

const WAFER_COUNT = 900;
const NO_DEFECT_SHARE = 0.55;
const SENSORS_PER_PATTERN = 3;
const SHIFT_SIGMAS = [2.5, 2.0, 1.5];

export interface PlantedLink {
  pattern: string;
  sensorKey: string;
  shiftSigma: number;
}

export interface SimulationResult {
  summary: PairedImportSummary;
  planted: PlantedLink[];
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  const u = Math.max(rng(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

interface SensorStats {
  key: string;
  mean: number;
  std: number;
  missingFraction: number;
}

async function loadSensorStats(): Promise<SensorStats[]> {
  const lots = await prisma.waferLot.findMany({
    where: { role: "HISTORICAL", outcome: "PASS" },
    select: { sensorValues: true },
  });
  if (lots.length === 0) {
    throw new Error("Seed the SECOM lots first (npm run import:secom) — the simulation borrows their sensor ranges.");
  }

  const keys = Object.keys(lots[0].sensorValues as SensorValues);
  const stats: SensorStats[] = [];
  for (const key of keys) {
    const values: number[] = [];
    for (const lot of lots) {
      const v = (lot.sensorValues as SensorValues)[key];
      if (v !== null && v !== undefined && Number.isFinite(v)) values.push(v);
    }
    if (values.length < 10) continue;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1));
    if (std === 0) continue;
    stats.push({ key, mean, std, missingFraction: 1 - values.length / lots.length });
  }
  return stats;
}

export async function seedSimulatedPairs(seed = 42): Promise<SimulationResult> {
  const rng = mulberry32(seed);
  const stats = await loadSensorStats();

  const pool = stats.filter((s) => s.missingFraction < 0.1);
  const needed = DEFECT_PATTERNS.length * SENSORS_PER_PATTERN;
  if (pool.length < needed) throw new Error("Not enough usable sensors to plant links.");

  const shuffled = [...pool].sort(() => rng() - 0.5);
  const planted: PlantedLink[] = [];
  const shiftsByPattern = new Map<string, Map<string, number>>();
  DEFECT_PATTERNS.forEach((pattern, p) => {
    const shifts = new Map<string, number>();
    for (let s = 0; s < SENSORS_PER_PATTERN; s++) {
      const sensor = shuffled[p * SENSORS_PER_PATTERN + s];
      const direction = (p + s) % 2 === 0 ? 1 : -1;
      const shiftSigma = direction * SHIFT_SIGMAS[s];
      shifts.set(sensor.key, shiftSigma);
      planted.push({ pattern, sensorKey: sensor.key, shiftSigma });
    }
    shiftsByPattern.set(pattern, shifts);
  });

  const rows: PairedRow[] = [];
  for (let i = 0; i < WAFER_COUNT; i++) {
    const pattern = rng() < NO_DEFECT_SHARE ? NO_DEFECT : DEFECT_PATTERNS[Math.floor(rng() * DEFECT_PATTERNS.length)];
    const shifts = shiftsByPattern.get(pattern);

    const sensorValues: SensorValues = {};
    for (const sensor of stats) {
      if (rng() < sensor.missingFraction) {
        sensorValues[sensor.key] = null;
        continue;
      }
      const shift = shifts?.get(sensor.key) ?? 0;
      sensorValues[sensor.key] = sensor.mean + sensor.std * (gaussian(rng) + shift);
    }
    rows.push({ waferId: `SIM-${String(i + 1).padStart(4, "0")}`, defectPattern: pattern, sensorValues });
  }

  const summary = await importPairedRows(rows, true);
  return { summary, planted };
}
