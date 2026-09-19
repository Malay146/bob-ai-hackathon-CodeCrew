"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PairingActions() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [importing, setImporting] = useState(false);
  const [simulating, setSimulating] = useState(false);

  async function simulate() {
    setSimulating(true);
    try {
      const res = await fetch("/api/pairing/simulate", { method: "POST" });
      const data = (await res.json()) as { totalWafers?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Simulation failed.");
      toast.success(`Generated ${data.totalWafers} simulated wafers.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulation failed.");
    } finally {
      setSimulating(false);
    }
  }

  async function importCsv() {
    if (!file || !acknowledged) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.set("paired", file);
      const res = await fetch("/api/pairing/import", { method: "POST", body: formData });
      const data = (await res.json()) as { totalWafers?: number; sensorCount?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Import failed.");
      toast.success(`Imported ${data.totalWafers} wafers with ${data.sensorCount} sensor columns.`);
      setAcknowledged(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <p className="font-medium text-sm">Import real paired data</p>
        <p className="text-muted-foreground text-xs">
          CSV with a header row: <code className="rounded bg-muted px-1">wafer_id</code>,{" "}
          <code className="rounded bg-muted px-1">defect_pattern</code>, then one numeric column per sensor. Pattern
          must be one of the 8 WM-811K names, or <code className="rounded bg-muted px-1">None</code>. Replaces all
          current paired data.
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="paired-file">Paired CSV</Label>
          <Input
            id="paired-file"
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="pair-ack" checked={acknowledged} onCheckedChange={(v) => setAcknowledged(v === true)} />
          <Label htmlFor="pair-ack" className="font-normal text-sm">
            I understand this replaces the current paired data.
          </Label>
        </div>
        <div>
          <Button onClick={() => void importCsv()} disabled={!file || !acknowledged || importing}>
            {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Import CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-medium text-sm">Or use simulated data</p>
        <p className="text-muted-foreground text-xs">
          No public dataset pairs wafer maps with sensor readings, so this generates one from real SECOM sensor ranges
          with a few sensor-to-pattern links planted. It shows the analysis works; it is not evidence about a real fab.
          Refused if real paired data is loaded.
        </p>
        <div>
          <Button variant="outline" onClick={() => void simulate()} disabled={simulating}>
            {simulating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generate simulated data
          </Button>
        </div>
      </div>
    </div>
  );
}
