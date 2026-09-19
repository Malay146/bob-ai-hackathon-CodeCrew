import type { Prisma } from "@prisma/client";

import type { SensorValues } from "@/lib/analysis/types";
import { prisma } from "@/lib/db";

import { normalizePattern } from "./patterns";

const MIN_SENSOR_COLUMNS = 5;
const MIN_ROWS = 20;
const BATCH_SIZE = 200;

export interface PairedRow {
  waferId: string;
  defectPattern: string;
  sensorValues: SensorValues;
}

export interface PairedImportSummary {
  totalWafers: number;
  sensorCount: number;
  patternCounts: Record<string, number>;
  simulated: boolean;
}

function parseCell(raw: string): number | null {
  const cell = raw.trim();
  if (cell === "" || cell.toLowerCase() === "nan" || cell.toLowerCase() === "null") return null;
  const value = Number(cell);
  return Number.isFinite(value) ? value : null;
}

/**
 * Parses a paired CSV: a header row containing `wafer_id` and
 * `defect_pattern`, plus any number of numeric sensor columns (every other
 * column is treated as a sensor). Blank / NaN cells become missing values.
 */
export function parsePairedCsv(csvText: string): PairedRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error("The CSV needs a header row and at least one data row.");

  const header = lines[0].split(",").map((h) => h.trim());
  const idCol = header.findIndex((h) => h.toLowerCase() === "wafer_id");
  const patternCol = header.findIndex((h) => h.toLowerCase() === "defect_pattern");
  if (idCol === -1 || patternCol === -1) {
    throw new Error("The header row must include `wafer_id` and `defect_pattern` columns.");
  }

  const sensorCols = header.map((name, i) => ({ name, i })).filter(({ i }) => i !== idCol && i !== patternCol);
  if (sensorCols.length < MIN_SENSOR_COLUMNS) {
    throw new Error(`Only ${sensorCols.length} sensor column(s) found — expected at least ${MIN_SENSOR_COLUMNS}.`);
  }

  return lines.slice(1).map((line, rowIndex) => {
    const cells = line.split(",");
    if (cells.length !== header.length) {
      throw new Error(`Row ${rowIndex + 2} has ${cells.length} columns, expected ${header.length}.`);
    }
    const pattern = normalizePattern(cells[patternCol]);
    if (!pattern) {
      throw new Error(`Row ${rowIndex + 2}: unknown defect pattern "${cells[patternCol].trim()}".`);
    }
    const sensorValues: SensorValues = {};
    for (const { name, i } of sensorCols) sensorValues[name] = parseCell(cells[i]);
    return { waferId: cells[idCol].trim(), defectPattern: pattern, sensorValues };
  });
}

/** Replaces all paired wafers with `rows`. Validation runs before anything is deleted. */
export async function importPairedRows(rows: PairedRow[], simulated: boolean): Promise<PairedImportSummary> {
  if (rows.length < MIN_ROWS) throw new Error(`Only ${rows.length} wafer(s) — expected at least ${MIN_ROWS}.`);

  const ids = new Set<string>();
  for (const row of rows) {
    if (!row.waferId) throw new Error("A row has an empty wafer_id.");
    if (ids.has(row.waferId)) throw new Error(`Duplicate wafer_id "${row.waferId}".`);
    ids.add(row.waferId);
  }

  await prisma.pairedWafer.deleteMany();

  let batch: Prisma.PairedWaferCreateManyInput[] = [];
  for (let i = 0; i < rows.length; i++) {
    batch.push({
      waferId: rows[i].waferId,
      defectPattern: rows[i].defectPattern,
      sensorValues: rows[i].sensorValues,
      simulated,
    });
    if (batch.length >= BATCH_SIZE || i === rows.length - 1) {
      await prisma.pairedWafer.createMany({ data: batch });
      batch = [];
    }
  }

  const patternCounts: Record<string, number> = {};
  for (const row of rows) patternCounts[row.defectPattern] = (patternCounts[row.defectPattern] ?? 0) + 1;

  return {
    totalWafers: rows.length,
    sensorCount: Object.keys(rows[0].sensorValues).length,
    patternCounts,
    simulated,
  };
}
