// Shared label order and cause/action lookup for the WM-811K defect-pattern CNN.
// Imported by the browser classifier component AND the MCP server tool — do not
// add any Node.js-only or browser-only imports here.

export const DEFECT_LABELS = [
  "Center",
  "Donut",
  "Edge-Loc",
  "Edge-Ring",
  "Loc",
  "Near-full",
  "Random",
  "Scratch",
] as const;

export type DefectLabel = (typeof DEFECT_LABELS)[number];

export const DEFECT_CAUSES: Record<string, { cause: string; action: string }> = {
  Center: {
    cause: "Chuck temperature non-uniformity or center-biased deposition",
    action: "Inspect chuck heating zones and recalibrate temperature uniformity",
  },
  Donut: {
    cause: "Deposition/etch rate non-uniformity radiating from wafer center",
    action: "Check gas flow distribution and chamber pressure profile",
  },
  "Edge-Loc": {
    cause: "Localized edge handling damage or edge-bead residue",
    action: "Inspect edge-bead removal step and wafer handling arms",
  },
  "Edge-Ring": {
    cause: "CMP or etch non-uniformity concentrated at the wafer edge",
    action: "Recalibrate CMP pad pressure or etch edge-ring control",
  },
  Loc: {
    cause: "Localized particle contamination or tool defect",
    action: "Run a particle contamination sweep on the implicated chamber",
  },
  "Near-full": {
    cause: "Severe, fab-wide process failure across the wafer",
    action: "Halt the line and investigate the immediately preceding process step",
  },
  Random: {
    cause: "Generalized particle contamination, not process-specific",
    action: "Audit cleanroom particle counts and wafer handling protocol",
  },
  Scratch: {
    cause: "Physical handling damage during transport or loading",
    action: "Inspect robotic handlers and cassette interfaces for damage",
  },
};

// ---------------------------------------------------------------------------
// Wafer-state pre-check. The CNN only knows the 8 defect patterns above — it has
// no "no defect" or "not a wafer" output and must always pick one, so a perfect
// wafer or a blank image still comes back as some pattern. These rules run first
// on the die counts and short-circuit the model for the cases it can't express.
//
// Thresholds are calibrated on the bundled samples (40×40 grid, ~1,250 dies inside
// the wafer circle): real defect wafers fail 6.5%–34% of dies, Near-full fails 94%.
// ---------------------------------------------------------------------------

export type WaferState = "perfect" | "destroyed" | "not-a-wafer" | "defect-pattern";

/** Luminance cutoffs for a greyscale wafer map: dark = blank, mid = pass die, bright = fail die. */
export const BLANK_MAX = 0.33;
export const PASS_MAX = 0.66;

export const MIN_VALID_DIE_FRACTION = 0.05; // below this it isn't a wafer map at all
export const PERFECT_MAX_FAIL_FRACTION = 0.005; // ≤ 0.5% failed dies → perfect
export const DESTROYED_MIN_FAIL_FRACTION = 0.98; // ≥ 98% failed dies → destroyed

export interface WaferAssessment {
  state: WaferState;
  validDies: number;
  failDies: number;
  failFraction: number;
}

/** `luminance` is a flat grid of 0..1 values (one per die cell). */
export function assessWaferGrid(luminance: ArrayLike<number>): WaferAssessment {
  let validDies = 0;
  let failDies = 0;
  for (let i = 0; i < luminance.length; i++) {
    const v = luminance[i];
    if (v < BLANK_MAX) continue;
    validDies++;
    if (v >= PASS_MAX) failDies++;
  }
  const failFraction = validDies === 0 ? 0 : failDies / validDies;

  let state: WaferState = "defect-pattern";
  if (validDies < luminance.length * MIN_VALID_DIE_FRACTION) state = "not-a-wafer";
  else if (failFraction <= PERFECT_MAX_FAIL_FRACTION) state = "perfect";
  else if (failFraction >= DESTROYED_MIN_FAIL_FRACTION) state = "destroyed";

  return { state, validDies, failDies, failFraction };
}

export const WAFER_STATE_INFO: Record<
  Exclude<WaferState, "defect-pattern">,
  { title: string; cause: string; action: string }
> = {
  perfect: {
    title: "Perfect wafer",
    cause: "No failed dies (or only stray isolated ones) — no defect pattern present",
    action: "No corrective action needed; release the wafer",
  },
  destroyed: {
    title: "Destroyed wafer",
    cause: "Essentially every die failed — a catastrophic, wafer-wide failure rather than a localised pattern",
    action:
      "Quarantine the lot and halt the tool; check the most recent recipe change, maintenance event and incoming material",
  },
  "not-a-wafer": {
    title: "Not a wafer map",
    cause: "The image has almost no dies in it, so there is nothing to classify",
    action:
      "Upload a wafer map image (dark = blank, mid-grey = pass die, bright = fail die) — see the colour convention above",
  },
};
