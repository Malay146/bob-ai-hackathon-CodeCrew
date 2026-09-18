"use client";

import { useRef, useState } from "react";

import { AlertTriangle, Loader2, ScanLine, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DEFECT_CAUSES, DEFECT_LABELS } from "@/lib/analysis/defect-image";

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

async function classify(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
): Promise<Prediction[]> {
  const tf = await import("@tensorflow/tfjs");

  canvas.width = IMG;
  canvas.height = IMG;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false; // nearest-neighbour — die states are categorical
  ctx.clearRect(0, 0, IMG, IMG);
  ctx.drawImage(img, 0, 0, IMG, IMG);
  const data = ctx.getImageData(0, 0, IMG, IMG).data;

  const model = await getModel();

  const input = tf.tidy(() => {
    const buf = new Float32Array(IMG * IMG * 3);
    for (let i = 0; i < IMG * IMG; i++) {
      const v = data[i * 4] / 255; // red channel; PNG is greyscale 0/128/255
      const channel = v < 0.33 ? 0 : v < 0.66 ? 1 : 2;
      buf[i * 3 + channel] = 1;
    }
    return tf.tensor(buf, [1, IMG, IMG, 3]);
  });

  const output = model.predict(input) as TF.Tensor;
  const scores = Array.from(await output.data());
  input.dispose();
  output.dispose();

  return DEFECT_LABELS.map((label, i) => ({ label, confidence: scores[i] })).sort(
    (a, b) => b.confidence - a.confidence,
  );
}

type Status = "idle" | "loading-model" | "classifying" | "done" | "error";

export function DefectClassifier() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function runClassify(src: string, label?: string) {
    setStatus("loading-model");
    setError(null);
    setPredictions([]);
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
        img.onerror = () => reject(new Error("Image failed to load"));
        img.src = src;
      });

      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not available");

      const results = await classify(img, canvas);
      setPredictions(results);
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
    const url = URL.createObjectURL(file);
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
          Click a pattern to load the bundled sample, or upload your own 40×40 PNG:
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
          Upload PNG
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={handleFileChange}
        />
        <span className="text-muted-foreground text-xs">
          Must be a 40×40 greyscale wafer map (0 = blank, 128 = pass, 255 = fail)
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
