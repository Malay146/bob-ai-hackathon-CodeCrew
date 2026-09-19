// Same 8 names the WM-811K classifier in public/models/wafer-defect emits,
// plus "None" for wafers with no defect pattern.
export const DEFECT_PATTERNS = [
  "Center",
  "Donut",
  "Edge-Loc",
  "Edge-Ring",
  "Loc",
  "Near-full",
  "Random",
  "Scratch",
] as const;

export type DefectPattern = (typeof DEFECT_PATTERNS)[number];

export const NO_DEFECT = "None";

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const CANONICAL = new Map<string, string>([
  ...DEFECT_PATTERNS.map((p) => [squash(p), p] as [string, string]),
  [squash(NO_DEFECT), NO_DEFECT],
]);

/** Accepts "edge ring", "Edge_Ring", "NEAR-FULL" etc.; returns the canonical name or null. */
export function normalizePattern(raw: string): string | null {
  return CANONICAL.get(squash(raw)) ?? null;
}
