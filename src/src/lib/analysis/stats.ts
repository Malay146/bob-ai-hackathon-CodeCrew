// Plain-statistics building blocks — no ML libraries. Root cause ranking and
// risk scoring are both built from these primitives: correlation to find
// suspect sensors, z-score to say how far a specific lot deviates, distance
// to score similarity to the historical fail cluster.

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function stdDev(values: number[], meanValue = mean(values)): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + (v - meanValue) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Pearson correlation between a numeric series `x` and a binary 0/1 series
 * `y` (point-biserial correlation). Used to rank how strongly each sensor's
 * readings track FAIL outcomes across the historical population.
 */
export function pointBiserialCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const meanX = mean(x);
  const meanY = mean(y);
  const stdX = stdDev(x, meanX);
  const stdY = stdDev(y, meanY);
  if (stdX === 0 || stdY === 0) return 0;

  let covariance = 0;
  for (let i = 0; i < x.length; i++) {
    covariance += (x[i] - meanX) * (y[i] - meanY);
  }
  covariance /= x.length - 1;

  return covariance / (stdX * stdY);
}

export function zScore(value: number, meanValue: number, stdDevValue: number): number {
  if (stdDevValue === 0) return 0;
  return (value - meanValue) / stdDevValue;
}

/** Filters out null/undefined/NaN, pairing two arrays index-for-index. */
export function pairwiseValid(a: (number | null)[], b: (number | null)[]): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < a.length; i++) {
    const av = a[i];
    const bv = b[i];
    if (av === null || bv === null || Number.isNaN(av) || Number.isNaN(bv)) continue;
    x.push(av);
    y.push(bv);
  }
  return { x, y };
}
