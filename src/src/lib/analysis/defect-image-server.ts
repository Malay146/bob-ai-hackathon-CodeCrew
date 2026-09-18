// Server-only module for defect-image classification.
// Uses pngjs to decode PNGs and a custom fs IO handler to load the TF.js
// model from disk — no canvas API, no @tensorflow/tfjs-node, no native build.
// Import this ONLY from the MCP server — never from any client bundle.

import * as tf from "@tensorflow/tfjs";
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

import { DEFECT_CAUSES, DEFECT_LABELS } from "./defect-image";

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

function pngToTensor(buf: Buffer): tf.Tensor {
  const png = PNG.sync.read(buf);
  if (png.width !== IMG || png.height !== IMG) {
    throw new Error(
      `expected a ${IMG}×${IMG} wafer map PNG, got ${png.width}×${png.height}`,
    );
  }
  const data = new Float32Array(IMG * IMG * 3);
  for (let i = 0; i < IMG * IMG; i++) {
    const v = png.data[i * 4] / 255; // red channel (greyscale: 0=blank, 128=pass, 255=fail)
    const ch = v < 0.33 ? 0 : v < 0.66 ? 1 : 2;
    data[i * 3 + ch] = 1;
  }
  return tf.tensor(data, [1, IMG, IMG, 3]);
}

export interface DefectResult {
  ranked: Array<{ label: string; confidence: number }>;
  topCause: string;
  topAction: string;
}

export async function classifyDefectPng(buf: Buffer): Promise<DefectResult> {
  const model = await getServerModel();
  const input = pngToTensor(buf);
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
