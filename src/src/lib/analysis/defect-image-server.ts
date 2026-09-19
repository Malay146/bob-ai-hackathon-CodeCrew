// Server-only module for defect-image classification.
// Uses pngjs to decode PNGs and a custom fs IO handler to load the TF.js
// model from disk — no canvas API, no @tensorflow/tfjs-node, no native build.
// Import this ONLY from the MCP server — never from any client bundle.

import * as tf from "@tensorflow/tfjs";
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

import {
  assessWaferGrid,
  DEFECT_CAUSES,
  DEFECT_LABELS,
  WAFER_STATE_INFO,
  type WaferAssessment,
} from "./defect-image";

const IMG = 40;
const MODEL_DIR = path.join(process.cwd(), "public", "models", "wafer-defect");
const SAMPLES_DIR = path.join(process.cwd(), "public", "samples");

// Custom IO handler that loads model.json + weight shards from the local filesystem.
function fsHandler(dir: string): tf.io.IOHandler {
  return {
    load: async () => {
      const mj = JSON.parse(fs.readFileSync(path.join(dir, "model.json"), "utf8")) as {
        modelTopology: unknown;
        weightsManifest: Array<{ paths: string[]; weights: tf.io.WeightsManifestEntry[] }>;
      };
      const specs: tf.io.WeightsManifestEntry[] = [];
      const bufs: Buffer[] = [];
      for (const group of mj.weightsManifest) {
        for (const p of group.paths) bufs.push(fs.readFileSync(path.join(dir, p)));
        specs.push(...group.weights);
      }
      const all = Buffer.concat(bufs);
      return {
        modelTopology: mj.modelTopology as {},
        weightSpecs: specs,
        weightData: all.buffer.slice(all.byteOffset, all.byteOffset + all.byteLength),
      };
    },
  };
}

// Singleton: load the model once per process lifetime.
let serverModel: Promise<tf.LayersModel> | null = null;
function getServerModel(): Promise<tf.LayersModel> {
  if (!serverModel) serverModel = tf.loadLayersModel(fsHandler(MODEL_DIR));
  return serverModel;
}

/** Decodes a 40×40 PNG into a flat grid of 0..1 luminance values (one per die cell). */
function pngToGrid(buf: Buffer): Float32Array {
  const png = PNG.sync.read(buf);
  if (png.width !== IMG || png.height !== IMG) {
    throw new Error(
      `expected a ${IMG}×${IMG} wafer map PNG, got ${png.width}×${png.height}`,
    );
  }
  const grid = new Float32Array(IMG * IMG);
  for (let i = 0; i < IMG * IMG; i++) {
    // Luminance — greyscale maps (0=blank, 128=pass, 255=fail) are unchanged.
    grid[i] = (0.299 * png.data[i * 4] + 0.587 * png.data[i * 4 + 1] + 0.114 * png.data[i * 4 + 2]) / 255;
  }
  return grid;
}

function gridToTensor(grid: Float32Array): tf.Tensor {
  const data = new Float32Array(IMG * IMG * 3);
  for (let i = 0; i < IMG * IMG; i++) {
    const v = grid[i];
    const ch = v < 0.33 ? 0 : v < 0.66 ? 1 : 2;
    data[i * 3 + ch] = 1;
  }
  return tf.tensor(data, [1, IMG, IMG, 3]);
}

export interface DefectResult {
  /** "defect-pattern" means the CNN ran; any other state was decided from die counts alone. */
  state: WaferAssessment["state"];
  assessment: WaferAssessment;
  /** Human-readable outcome: the top pattern name, or e.g. "Perfect wafer". */
  title: string;
  /** Empty unless state is "defect-pattern". */
  ranked: Array<{ label: string; confidence: number }>;
  topCause: string;
  topAction: string;
}

export async function classifyDefectPng(buf: Buffer): Promise<DefectResult> {
  const grid = pngToGrid(buf);
  const assessment = assessWaferGrid(grid);
  if (assessment.state !== "defect-pattern") {
    const info = WAFER_STATE_INFO[assessment.state];
    return {
      state: assessment.state,
      assessment,
      title: info.title,
      ranked: [],
      topCause: info.cause,
      topAction: info.action,
    };
  }

  const model = await getServerModel();
  const input = gridToTensor(grid);
  const output = model.predict(input) as tf.Tensor;
  const scores = Array.from(await output.data());
  input.dispose();
  output.dispose();

  const ranked = DEFECT_LABELS.map((label, i) => ({
    label,
    confidence: scores[i],
  })).sort((a, b) => b.confidence - a.confidence);

  const top = ranked[0];
  const info = DEFECT_CAUSES[top.label];

  return {
    state: "defect-pattern",
    assessment,
    title: top.label,
    ranked,
    topCause: info?.cause ?? "Unknown",
    topAction: info?.action ?? "Unknown",
  };
}

/**
 * Convenience wrapper used by the MCP tool.
 * Accepts either a label name (loads the bundled sample PNG) or raw base64.
 * Guards sample names against path traversal.
 */
export async function classifyByLabelOrBase64(opts: {
  sample?: string;
  image_base64?: string;
}): Promise<DefectResult> {
  const { sample, image_base64 } = opts;

  if (sample !== undefined && image_base64 !== undefined) {
    throw new Error("Provide either 'sample' or 'image_base64', not both.");
  }
  if (sample === undefined && image_base64 === undefined) {
    throw new Error("Provide either 'sample' (a label name) or 'image_base64' (a base64 PNG).");
  }

  let buf: Buffer;

  if (sample !== undefined) {
    // Guard against path traversal — only allow exact label strings.
    if (!(DEFECT_LABELS as readonly string[]).includes(sample)) {
      throw new Error(
        `Unknown sample label '${sample}'. Must be one of: ${DEFECT_LABELS.join(", ")}`,
      );
    }
    const samplePath = path.join(SAMPLES_DIR, `${sample}.png`);
    buf = fs.readFileSync(samplePath);
  } else {
    buf = Buffer.from(image_base64!, "base64");
  }

  return classifyDefectPng(buf);
}
