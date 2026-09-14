import type { Prisma } from "@prisma/client";

import { recomputeUpcomingBatchRisk } from "@/lib/analysis/risk";
import { computeSuspectSensors } from "@/lib/analysis/root-cause";
import { prisma } from "@/lib/db";

import { parseFeatureLine, parseLabelLine } from "./parse";

const UPCOMING_EVERY_NTH = 7;
const BATCH_SIZE = 200;
const MIN_EXPECTED_SENSOR_COLUMNS = 5;

export interface ImportSummary {
  totalLots: number;
  historicalCount: number;
  upcomingCount: number;
  topSuspectSensor: { sensorKey: string; correlation: number } | null;
  scoredBatches: number;
}

/**
 * Shared by the CLI seed script (scripts/import-secom.ts, reads from
 * data-raw/) and the "Import dataset" page (reads from an upload) — parses
 * a SECOM-format feature/label file pair, replaces the existing lot data
 * with it, and re-runs the correlation + risk analysis. Every 7th lot (by
 * row order) is held back as an UPCOMING batch, same as the CLI seed.
 *
 * Parsing happens fully before anything is deleted, so a malformed upload
 * fails without touching the existing database.
 */
export async function importSecomDataset(featureText: string, labelText: string): Promise<ImportSummary> {
  const featureLines = featureText.trim().split("\n").filter(Boolean);
  const labelLines = labelText.trim().split("\n").filter(Boolean);

  if (featureLines.length === 0) {
    throw new Error("The features file is empty.");
  }
  if (featureLines.length !== labelLines.length) {
    throw new Error(`Row count mismatch: ${featureLines.length} feature rows vs ${labelLines.length} label rows.`);
  }

  const firstRowColumnCount = Object.keys(parseFeatureLine(featureLines[0])).length;
  if (firstRowColumnCount < MIN_EXPECTED_SENSOR_COLUMNS) {
    throw new Error(
      `The features file only parsed ${firstRowColumnCount} column(s) per row — expected many sensor readings. ` +
        `Check you selected the features file (secom.data), not the labels file, and that it's whitespace-separated.`,
    );
  }

  const parsedRows = featureLines.map((line, i) => {
    const sensorValues = parseFeatureLine(line);
    const { outcome, capturedAt } = parseLabelLine(labelLines[i]);
    return { sensorValues, outcome, capturedAt };
  });

  await prisma.rootCauseFinding.deleteMany();
  await prisma.suspectSensor.deleteMany();
  await prisma.waferLot.deleteMany();

  let batch: Prisma.WaferLotCreateManyInput[] = [];
  for (let i = 0; i < parsedRows.length; i++) {
    const { sensorValues, outcome, capturedAt } = parsedRows[i];
    batch.push({
      lotNumber: i + 1,
      capturedAt,
      outcome,
      role: (i + 1) % UPCOMING_EVERY_NTH === 0 ? "UPCOMING" : "HISTORICAL",
      sensorValues,
    });

    if (batch.length >= BATCH_SIZE || i === parsedRows.length - 1) {
      await prisma.waferLot.createMany({ data: batch });
      batch = [];
    }
  }

  const [historicalCount, upcomingCount] = await Promise.all([
    prisma.waferLot.count({ where: { role: "HISTORICAL" } }),
    prisma.waferLot.count({ where: { role: "UPCOMING" } }),
  ]);

  const suspects = await computeSuspectSensors();
  const scoredBatches = await recomputeUpcomingBatchRisk();

  return {
    totalLots: parsedRows.length,
    historicalCount,
    upcomingCount,
    topSuspectSensor: suspects[0] ? { sensorKey: suspects[0].sensorKey, correlation: suspects[0].correlation } : null,
    scoredBatches,
  };
}
