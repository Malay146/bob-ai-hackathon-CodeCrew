"use client";

import { useRef, useState } from "react";

import { AlertTriangle, Loader2, ScanLine, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  assessWaferGrid,
  DEFECT_CAUSES,
  DEFECT_LABELS,
  WAFER_STATE_INFO,
  type WaferAssessment,
} from "@/lib/analysis/defect-image";

// TF.js is loaded lazily — import type only here, dynamic import in getModel()
// so it never runs during SSR (page uses dynamic with ssr:false).
import type * as TF from "@tensorflow/tfjs";

const IMG = 40;

// Module-level cache so the model is fetched only once per browser session.
let modelPromise: Promise<TF.LayersModel> | null = null;
function getModel(): Promise<TF.LayersModel> {
  if (!modelPromise) {
    modelPromise = import("@tensorflow/tfjs").then((tf) =>
      tf.loadLayersModel("/models/wafer-defect/model.json"),
    );
  }
  return modelPromise;
}

interface Prediction {
  label: string;
  confidence: number;
}

// Cap on the decoded working size so a huge photo can't allocate a giant canvas.
const MAX_SIDE = 2048;

/**
 * Reduces any decoded image to a 40×40 grid of luminance values by averaging the pixel block
 * behind each cell (an exact box filter). A native 40×40 source maps 1:1 and stays verbatim;
 * larger PNGs, JPEG/WebP compression noise and colour-mapped maps all collapse onto the grid
 * without the ringing a browser resize filter adds around sharp cell edges.
 */
function toGridLuminance(img: HTMLImageElement, canvas: HTMLCanvasElement): Float32Array {
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(IMG, Math.round(img.naturalWidth * scale));
  const h = Math.max(IMG, Math.round(img.naturalHeight * scale));

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000"; // transparent pixels (PNG/WebP/GIF alpha) read as blank dies
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const grid = new Float32Array(IMG * IMG);
  for (let cy = 0; cy < IMG; cy++) {
    const y0 = Math.floor((cy * h) / IMG);
    const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * h) / IMG));
    for (let cx = 0; cx < IMG; cx++) {
      const x0 = Math.floor((cx * w) / IMG);
      const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * w) / IMG));
      let sum = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
      }
      grid[cy * IMG + cx] = sum / ((y1 - y0) * (x1 - x0)) / 255;
    }
  }
  return grid;
}

type ClassifyResult =
  | { kind: "pattern"; predictions: Prediction[]; assessment: WaferAssessment }
  | { kind: "state"; assessment: WaferAssessment };

async function classify(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
): Promise<ClassifyResult> {
  const grid = toGridLuminance(img, canvas);

  // The CNN only knows 8 defect patterns and must always pick one, so perfect / destroyed /
  // not-a-wafer images are decided from die counts first and never reach the model.
  const assessment = assessWaferGrid(grid);
  if (assessment.state !== "defect-pattern") return { kind: "state", assessment };

  const tf = await import("@tensorflow/tfjs");

  const model = await getModel();

  const input = tf.tidy(() => {
    const buf = new Float32Array(IMG * IMG * 3);
    for (let i = 0; i < IMG * IMG; i++) {
      const v = grid[i]; // greyscale 0/128/255 → 0 / 0.5 / 1
      const channel = v < 0.33 ? 0 : v < 0.66 ? 1 : 2;
      buf[i * 3 + channel] = 1;
    }
    return tf.tensor(buf, [1, IMG, IMG, 3]);
  });

  const output = model.predict(input) as TF.Tensor;
  const scores = Array.from(await output.data());
  input.dispose();
  output.dispose();

  const predictions = DEFECT_LABELS.map((label, i) => ({ label, confidence: scores[i] })).sort(
    (a, b) => b.confidence - a.confidence,
  );
  return { kind: "pattern", predictions, assessment };
}

type Status = "idle" | "loading-model" | "classifying" | "done" | "error";

export function DefectClassifier() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [assessment, setAssessment] = useState<WaferAssessment | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  async function runClassify(src: string, label?: string) {
    setStatus("loading-model");
    setError(null);
    setPredictions([]);
    setAssessment(null);
    setPreviewSrc(src);
    setActiveLabel(label ?? null);

    try {
      // Preload the model (no-op if already loaded)
      await getModel();
      setStatus("classifying");

      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () =>
          reject(new Error("Couldn't read that image — try PNG, JPEG, WebP, GIF, BMP or AVIF."));
        img.src = src;
      });

      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not available");

      const result = await classify(img, canvas);
      setAssessment(result.assessment);
      if (result.kind === "pattern") setPredictions(result.predictions);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Classification failed");
      setStatus("error");
    }
  }

  function handleSampleClick(label: string) {
    void runClassify(`/samples/${label}.png`, label);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    void runClassify(url, undefined);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  const top = predictions[0];
  const topInfo = top ? DEFECT_CAUSES[top.label] : null;
  const isWorking = status === "loading-model" || status === "classifying";

  return (
    <div className="flex flex-col gap-6">
      {/* Sample selector row */}
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">
          Click a pattern to load the bundled sample, or upload your own wafer map image:
        </p>
        <div className="flex flex-wrap gap-2">
          {DEFECT_LABELS.map((label) => (
            <Button
              key={label}
              variant={activeLabel === label ? "default" : "outline"}
              size="sm"
              disabled={isWorking}
              onClick={() => handleSampleClick(label)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* File upload */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={isWorking}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          Upload image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif"
          className="hidden"
          onChange={handleFileChange}
        />
        <span className="text-muted-foreground text-xs">
          PNG, JPG/JPEG, WebP, GIF, BMP or AVIF, any size (resized to 40×40). Expects the WM-811K
          convention: dark = blank, mid-grey = pass die, bright = fail die.
        </span>
      </div>

      {/* Status / spinner */}
      {status === "loading-model" && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading model (~450 KB)…
        </div>
      )}
      {status === "classifying" && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Running inference…
        </div>
      )}
      {status === "error" && error && (
        <p className="flex items-center gap-1.5 text-destructive text-sm">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      {/* Preview + results side by side */}
      {(previewSrc || status === "done") && (
        <div className="flex flex-wrap gap-6">
          {/* Wafer map preview */}
          {previewSrc && (
            <div className="flex flex-col gap-1">
              <p className="text-muted-foreground text-xs">Wafer map (scaled up)</p>
              {/* Hidden canvas used for pixel extraction */}
              <canvas ref={canvasRef} className="hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt="Wafer defect map preview"
                width={200}
                height={200}
                style={{ imageRendering: "pixelated" }}
                className="rounded-md border bg-muted"
              />
            </div>
          )}

          {/* Perfect / destroyed / not-a-wafer — decided from die counts, model not run */}
          {status === "done" && assessment && assessment.state !== "defect-pattern" && (
            <div className="flex flex-1 flex-col gap-4 min-w-[260px]">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ScanLine className="size-4" />
                    Result
                    <Badge variant={assessment.state === "perfect" ? "default" : "destructive"}>
                      {WAFER_STATE_INFO[assessment.state].title}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  {assessment.state !== "not-a-wafer" && (
                    <div className="text-muted-foreground">
                      {assessment.failDies} of {assessment.validDies} dies failed (
                      {(assessment.failFraction * 100).toFixed(1)}%)
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Cause: </span>
                    <span className="text-muted-foreground">{WAFER_STATE_INFO[assessment.state].cause}</span>
                  </div>
                  <div>
                    <span className="font-medium">Recommended action: </span>
                    <span className="text-muted-foreground">{WAFER_STATE_INFO[assessment.state].action}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Decided from the die counts; the pattern classifier wasn&apos;t run because it only knows the 8
                    defect patterns.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Predictions */}
          {status === "done" && predictions.length > 0 && (
            <div className="flex flex-1 flex-col gap-4 min-w-[260px]">
              {/* Top result with cause/action */}
              {top && topInfo && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ScanLine className="size-4" />
                      Top prediction
                      <Badge variant="default">{top.label}</Badge>
                      <span className="ml-auto text-muted-foreground text-sm font-normal">
                        {(top.confidence * 100).toFixed(1)}%
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 text-sm">
                    <div>
                      <span className="font-medium">Likely cause: </span>
                      <span className="text-muted-foreground">{topInfo.cause}</span>
                    </div>
                    <div>
                      <span className="font-medium">Recommended action: </span>
                      <span className="text-muted-foreground">{topInfo.action}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top 3 ranked */}
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs">Ranked predictions</p>
                {predictions.slice(0, 3).map((p, i) => (
                  <div key={p.label} className="flex items-center gap-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                      {i + 1}
                    </span>
                    <span className="w-24 text-sm font-medium">{p.label}</span>
                    <Progress value={p.confidence * 100} className="h-2 flex-1" />
                    <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">
                      {(p.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
