"use client";

import { useState } from "react";

import { AlertTriangle, ArrowDown, ArrowUp, Dices, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { RootCauseSummary } from "@/lib/analysis/types";

interface CheckResult {
  riskScore: number;
  sensorCount: number;
  findings: RootCauseSummary[];
}

interface SampleInfo {
  lotNumber: number;
  actualOutcome: "PASS" | "FAIL";
}

export function CheckBatchForm({ atRiskThreshold }: { atRiskThreshold: number }) {
  const [rawLine, setRawLine] = useState("");
  const [sample, setSample] = useState<SampleInfo | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSample() {
    setLoadingSample(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/check-batch/sample");
      const data = (await res.json()) as {
        rawLine?: string;
        lotNumber?: number;
        actualOutcome?: "PASS" | "FAIL";
        error?: string;
      };
      if (!res.ok || !data.rawLine) throw new Error(data.error ?? "Couldn't load a sample.");
      setRawLine(data.rawLine);
      setSample({ lotNumber: data.lotNumber ?? 0, actualOutcome: data.actualOutcome ?? "PASS" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load a sample.");
    } finally {
      setLoadingSample(false);
    }
  }

  async function analyze() {
    if (!rawLine.trim()) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/check-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawLine }),
      });
      const data = (await res.json()) as CheckResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Analysis failed.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  const atRisk = result !== null && result.riskScore >= atRiskThreshold;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-sm">
          {sample ? `Loaded lot #${sample.lotNumber} as an example` : "Paste 590 space-separated readings, or:"}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadSample()} disabled={loadingSample}>
          {loadingSample ? <Loader2 className="size-4 animate-spin" /> : <Dices className="size-4" />}
          Try a real upcoming batch
        </Button>
      </div>

      <Textarea
        value={rawLine}
        onChange={(e) => {
          setRawLine(e.target.value);
          setSample(null);
        }}
        placeholder="3030.93 2564 2187.7333 1411.1265 1.3602 ... (NaN for missing readings)"
        className="min-h-28 font-mono text-xs"
      />

      <div>
        <Button onClick={() => void analyze()} disabled={analyzing || !rawLine.trim()}>
          {analyzing && <Loader2 className="size-4 animate-spin" />}
          Analyze
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {result && (
        <div className="flex flex-col gap-5 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-muted-foreground text-sm">Risk score ({result.sensorCount} readings parsed)</div>
              <div className="flex items-center gap-3">
                <Progress value={result.riskScore} className="h-2 w-48" />
                <span className="font-medium text-2xl tabular-nums">{result.riskScore}</span>
                <Badge variant={atRisk ? "destructive" : "outline"}>{atRisk ? "At risk" : "Normal"}</Badge>
              </div>
            </div>
            {sample && (
              <div className="text-right text-muted-foreground text-sm">
                Actual outcome (lot #{sample.lotNumber}):{" "}
                <Badge variant={sample.actualOutcome === "PASS" ? "default" : "destructive"}>
                  {sample.actualOutcome}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {result.findings.length === 0 && (
              <p className="text-muted-foreground text-sm">No significant deviation found on any suspect sensor.</p>
            )}
            {result.findings.map((f, i) => (
              <div key={f.sensorKey} className="flex flex-col gap-1.5 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs">
                      {i + 1}
                    </span>
                    {f.sensorKey}
                    {f.direction === "HIGH" ? (
                      <ArrowUp className="size-3.5 text-destructive" />
                    ) : (
                      <ArrowDown className="size-3.5 text-destructive" />
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {(f.probability * 100).toFixed(0)}% · {f.deviationSigma.toFixed(1)}σ
                  </span>
                </div>
                <p className="flex items-start gap-1.5 text-muted-foreground text-xs">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {f.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
