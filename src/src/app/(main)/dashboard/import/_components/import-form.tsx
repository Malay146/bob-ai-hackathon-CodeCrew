"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { AlertTriangle, Loader2, Upload } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImportSummary {
  totalLots: number;
  historicalCount: number;
  upcomingCount: number;
  topSuspectSensor: { sensorKey: string; correlation: number } | null;
  scoredBatches: number;
}

export function ImportForm() {
  const [featuresFile, setFeaturesFile] = useState<File | null>(null);
  const [labelsFile, setLabelsFile] = useState<File | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const router = useRouter();

  async function submit() {
    if (!featuresFile || !labelsFile || !acknowledged) return;
    setPending(true);
    setError(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.set("features", featuresFile);
      formData.set("labels", labelsFile);

      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = (await res.json()) as ImportSummary & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Import failed.");

      setSummary(data);
      setAcknowledged(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setPending(false);
    }
  }

  const canSubmit = featuresFile && labelsFile && acknowledged && !pending;

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>This replaces all existing data</AlertTitle>
        <AlertDescription>
          Every current wafer lot, suspect sensor, and cached root cause finding is deleted and rebuilt from the
          uploaded files. This can&apos;t be undone.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-2">
        <Label htmlFor="features-file">Features file (secom.data format)</Label>
        <Input
          id="features-file"
          type="file"
          accept=".data,.txt,text/plain"
          onChange={(e) => setFeaturesFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="labels-file">Labels file (secom_labels.data format)</Label>
        <Input
          id="labels-file"
          type="file"
          accept=".data,.txt,text/plain"
          onChange={(e) => setLabelsFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="acknowledge" checked={acknowledged} onCheckedChange={(v) => setAcknowledged(v === true)} />
        <Label htmlFor="acknowledge" className="font-normal text-sm">
          I understand this replaces all existing wafer lot data.
        </Label>
      </div>

      <div>
        <Button onClick={() => void submit()} disabled={!canSubmit}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Import &amp; replace
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {summary && (
        <div className="flex flex-col gap-1 rounded-lg border p-4 text-sm">
          <p className="font-medium">Import complete</p>
          <p className="text-muted-foreground">
            {summary.totalLots} lots loaded — {summary.historicalCount} historical, {summary.upcomingCount} upcoming.
          </p>
          {summary.topSuspectSensor && (
            <p className="text-muted-foreground">
              Top suspect sensor: {summary.topSuspectSensor.sensorKey} (correlation{" "}
              {summary.topSuspectSensor.correlation.toFixed(3)})
            </p>
          )}
          <p className="text-muted-foreground">{summary.scoredBatches} upcoming batches scored.</p>
        </div>
      )}
    </div>
  );
}
