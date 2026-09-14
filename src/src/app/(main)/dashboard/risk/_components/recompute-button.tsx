"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function RecomputeButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function run() {
    setPending(true);
    try {
      const res = await fetch("/api/analysis/recompute", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { suspectCount: number; scoredCount: number };
      toast.success(`Recomputed: ${data.suspectCount} suspect sensors, ${data.scoredCount} batches rescored.`);
      router.refresh();
    } catch {
      toast.error("Recompute failed — check the server is reachable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void run()} disabled={pending}>
      <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
      Recompute analysis
    </Button>
  );
}
