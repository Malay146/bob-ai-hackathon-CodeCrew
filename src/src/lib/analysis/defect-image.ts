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
