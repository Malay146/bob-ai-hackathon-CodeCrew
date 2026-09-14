import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AT_RISK_THRESHOLD } from "@/lib/analysis/overview";
import { prisma } from "@/lib/db";

import { RecomputeButton } from "./_components/recompute-button";

export default async function Page() {
  const upcoming = await prisma.waferLot.findMany({
    where: { role: "UPCOMING" },
    orderBy: { riskScore: "desc" },
  });

  const flagged = upcoming.filter((l) => (l.riskScore ?? 0) >= AT_RISK_THRESHOLD);
  const flaggedCorrect = flagged.filter((l) => l.outcome === "FAIL").length;
  const precision = flagged.length > 0 ? (flaggedCorrect / flagged.length) * 100 : null;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Upcoming batch risk</CardTitle>
            <CardDescription>
              Batches whose process parameters resemble the historical low-yield population, flagged before their
              outcome is known. Threshold: {AT_RISK_THRESHOLD}/100.
            </CardDescription>
          </div>
          <RecomputeButton />
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div>
            <div className="font-medium text-2xl tabular-nums">{upcoming.length}</div>
            <div className="text-muted-foreground">Upcoming batches</div>
          </div>
          <div>
            <div className="font-medium text-2xl tabular-nums">{flagged.length}</div>
            <div className="text-muted-foreground">Flagged at-risk</div>
          </div>
          <div>
            <div className="font-medium text-2xl tabular-nums">
              {precision !== null ? `${precision.toFixed(0)}%` : "—"}
            </div>
            <div className="text-muted-foreground">Flags that actually failed (retrospective check)</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batch risk scores</CardTitle>
          <CardDescription>
            &quot;Actual outcome&quot; is shown only to demonstrate prediction accuracy — in a live fab it would be
            unknown until the batch runs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Risk score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actual outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcoming.map((lot) => {
                const atRisk = (lot.riskScore ?? 0) >= AT_RISK_THRESHOLD;
                return (
                  <TableRow key={lot.id}>
                    <TableCell className="font-medium">#{lot.lotNumber}</TableCell>
                    <TableCell className="w-56">
                      <div className="flex items-center gap-3">
                        <Progress value={lot.riskScore ?? 0} className="h-2" />
                        <span className="w-10 shrink-0 text-right tabular-nums">{lot.riskScore ?? 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={atRisk ? "destructive" : "outline"}>{atRisk ? "At risk" : "Normal"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lot.outcome}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
