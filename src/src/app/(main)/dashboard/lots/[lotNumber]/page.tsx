import { notFound } from "next/navigation";

import { AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { computeLotRootCauses } from "@/lib/analysis/root-cause";
import type { SensorValues } from "@/lib/analysis/types";
import { prisma } from "@/lib/db";

export default async function Page({ params }: { params: Promise<{ lotNumber: string }> }) {
  const { lotNumber: lotNumberParam } = await params;
  const lotNumber = Number(lotNumberParam);
  if (!Number.isInteger(lotNumber)) notFound();

  const lot = await prisma.waferLot.findUnique({ where: { lotNumber } });
  if (!lot) notFound();

  const findings = await computeLotRootCauses(lot.id);
  const sensorValues = lot.sensorValues as SensorValues;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lot #{lot.lotNumber}</CardTitle>
            <CardDescription>Captured {new Date(lot.capturedAt).toLocaleString()}</CardDescription>
          </div>
          <Badge variant={lot.outcome === "PASS" ? "default" : "destructive"} className="text-sm">
            {lot.outcome}
          </Badge>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ranked root causes</CardTitle>
          <CardDescription>
            Suspect sensors ranked by probability — weighted combination of fab-wide fail correlation and this
            lot&apos;s deviation from the healthy baseline
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {findings.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No significant deviation found on any fab-wide suspect sensor for this lot.
            </p>
          )}
          {findings.map((f, i) => (
            <div key={f.sensorKey} className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">{i + 1}</span>
                  {f.sensorKey}
                  {f.direction === "HIGH" ? (
                    <ArrowUp className="size-4 text-destructive" />
                  ) : (
                    <ArrowDown className="size-4 text-destructive" />
                  )}
                </div>
                <span className="text-muted-foreground text-sm tabular-nums">
                  reading {sensorValues[f.sensorKey]?.toFixed(2) ?? "—"} ({f.deviationSigma.toFixed(1)}σ)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={f.probability * 100} className="h-2" />
                <span className="w-14 shrink-0 text-right font-medium text-sm tabular-nums">
                  {(f.probability * 100).toFixed(0)}%
                </span>
              </div>
              <p className="flex items-start gap-2 text-muted-foreground text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {f.recommendation}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
