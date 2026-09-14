import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "WaferLens",
  version: packageJson.version,
  copyright: `© ${currentYear}, WaferLens.`,
  meta: {
    title: "WaferLens - Wafer Yield Root Cause & Defect Pattern Analyser",
    description:
      "WaferLens analyses wafer lot sensor data and defect reports to rank yield root causes, recommend corrective actions, and flag upcoming batches at risk of low yield.",
  },
};
