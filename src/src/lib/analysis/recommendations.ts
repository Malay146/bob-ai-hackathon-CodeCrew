// Templated corrective-action text. SECOM anonymizes sensor identity (no
// real equipment/station names), so recommendations are generic
// process-engineering guidance keyed off deviation direction and severity
// rather than a real equipment knowledge base — see known_limitations.

export function generateRecommendation(sensorKey: string, direction: "HIGH" | "LOW", sigma: number): string {
  const absSigma = Math.abs(sigma);
  let severity: "severely" | "moderately" | "slightly" = "slightly";
  if (absSigma >= 3) severity = "severely";
  else if (absSigma >= 2) severity = "moderately";
  const label = sensorKey.replace("S_", "Sensor ");

  if (direction === "HIGH") {
    return (
      `${label} is reading ${severity} above its normal (pass-lot) range (${sigma.toFixed(1)}σ). ` +
      `Inspect the equipment station feeding this sensor for drift, recalibrate or replace the probe, ` +
      `and review the last maintenance/PM log for that step before releasing further lots.`
    );
  }

  return (
    `${label} is reading ${severity} below its normal (pass-lot) range (${sigma.toFixed(1)}σ). ` +
    `Check for under-dosing, a blocked line, or a sensor fault at the corresponding process step, ` +
    `and cross-check against the equipment's setpoint log for recent changes.`
  );
}
