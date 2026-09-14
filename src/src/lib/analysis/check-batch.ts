import { parseFeatureLine } from "@/lib/secom/parse";

import { computeRiskScore } from "./risk";
import { getSuspectSensors, rankRootCauses } from "./root-cause";
import type { RootCauseSummary } from "./types";

export interface CheckBatchResult {
  riskScore: number;
  sensorCount: number;
  findings: RootCauseSummary[];
}

/**
 * Ad-hoc version of the risk/root-cause pipeline for a batch that isn't in
 * the database at all: paste one raw SECOM-format line (space-separated
 * sensor readings, "NaN" for missing) and get the same risk score + ranked
 * root causes an UPCOMING lot would get, without needing to seed it first.
 * This is the interactive "predict before it runs" demo.
 */
export async function checkBatch(rawLine: string): Promise<CheckBatchResult> {
  const sensorValues = parseFeatureLine(rawLine);
  const suspects = await getSuspectSensors();

  return {
    riskScore: computeRiskScore(sensorValues, suspects),
    sensorCount: Object.keys(sensorValues).length,
    findings: rankRootCauses(sensorValues, suspects),
  };
}
