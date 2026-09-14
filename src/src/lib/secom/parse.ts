// Parser for the UCI SECOM dataset's raw whitespace/quote format. Kept
// dependency-free (no csv library needed) since the format is trivial:
// secom.data      — one line per lot, 590 space-separated floats ("NaN" for missing)
// secom_labels.data — one line per lot: `<-1|1> "dd/MM/yyyy HH:mm:ss"`

import type { SensorValues } from "@/lib/analysis/types";

export function sensorKeyFor(index: number): string {
  return `S_${index + 1}`;
}

export function parseFeatureLine(line: string): SensorValues {
  const tokens = line.trim().split(/\s+/);
  const values: SensorValues = {};
  tokens.forEach((token, i) => {
    values[sensorKeyFor(i)] = token === "NaN" ? null : Number.parseFloat(token);
  });
  return values;
}

/** Inverse of parseFeatureLine — used to reconstruct an example line to paste into the "check a batch" form. */
export function toRawLine(sensorValues: SensorValues): string {
  const count = Object.keys(sensorValues).length;
  const tokens: string[] = [];
  for (let i = 0; i < count; i++) {
    const value = sensorValues[sensorKeyFor(i)];
    tokens.push(value === null || value === undefined ? "NaN" : String(value));
  }
  return tokens.join(" ");
}

export interface LabelRow {
  outcome: "PASS" | "FAIL";
  capturedAt: Date;
}

export function parseLabelLine(line: string): LabelRow {
  const match = line.trim().match(/^(-?\d+)\s+"(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})"$/);
  if (!match) throw new Error(`Unrecognised SECOM label line: ${line}`);

  const [, label, day, month, year, hour, minute, second] = match;
  const capturedAt = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  return { outcome: label === "1" ? "FAIL" : "PASS", capturedAt };
}
