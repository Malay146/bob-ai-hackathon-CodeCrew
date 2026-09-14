import { AlertTriangle, Gauge, ListChecks, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OverviewStats } from "@/lib/analysis/overview";

export function KpiCards({ stats }: { stats: OverviewStats }) {
  const yieldGood = stats.yieldPct >= 90;

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <Gauge className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Yield (historical lots)</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {stats.yieldPct.toFixed(1)}%
            </div>
            <Badge variant={yieldGood ? "default" : "destructive"}>
              {yieldGood ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {stats.passCount} pass
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">{stats.failCount} failed lots</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <ListChecks className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Lots analysed</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
            {stats.totalHistoricalLots}
          </div>
          <p className="text-muted-foreground text-sm">Historical lots in the knowledge base</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <AlertTriangle className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Top suspect sensor</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
            {stats.topSuspectSensor?.sensorKey ?? "—"}
          </div>
          <p className="text-muted-foreground text-sm">
            {stats.topSuspectSensor
              ? `Correlation ${stats.topSuspectSensor.correlation.toFixed(2)}`
              : "Not computed yet"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <AlertTriangle className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Upcoming batches at risk</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {stats.atRiskBatchCount}
            </div>
            <Badge variant={stats.atRiskBatchCount > 0 ? "destructive" : "default"}>
              of {stats.upcomingBatchCount}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Flagged before they run</p>
        </CardContent>
      </Card>
    </div>
  );
}
