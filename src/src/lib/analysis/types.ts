export type SensorValues = Record<string, number | null>;

export interface SuspectSensorSummary {
  sensorKey: string;
  correlation: number;
  passMean: number | null;
  failMean: number | null;
  stdDev: number | null;
  rank: number;
}

export interface RootCauseSummary {
  sensorKey: string;
  probability: number;
  deviationSigma: number;
  direction: "HIGH" | "LOW";
  recommendation: string;
}
