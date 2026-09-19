import { FlaskConical, Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { computePatternSensorLinks } from "@/lib/pairing/correlate";

import { PairingActions } from "./_components/pairing-actions";

export default async function Page() {
  const analysis = await computePatternSensorLinks();
  const hasData = analysis.totalWafers > 0;
  const isSimulated = hasData && analysis.simulatedCount > 0;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Sensor ↔ defect pattern</CardTitle>
          <CardDescription>
            For each wafer defect pattern, which sensors move with it? Each sensor is correlated against a &quot;has
            this pattern&quot; flag across wafers that have both sensor readings and a defect pattern.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {hasData && isSimulated && (
            <Alert>
              <FlaskConical className="size-4" />
              <AlertTitle>Simulated data</AlertTitle>
              <AlertDescription>
                These {analysis.totalWafers} wafers are generated: sensor ranges come from real SECOM lots, and a few
                sensor-to-pattern links were planted. Finding them shows the mechanism works — it says nothing about a
                real fab. Import a real paired CSV to replace it.
              </AlertDescription>
            </Alert>
          )}
          {hasData && !isSimulated && (
            <Alert>
              <Info className="size-4" />
              <AlertTitle>Imported data</AlertTitle>
              <AlertDescription>
                {analysis.totalWafers} wafers with {analysis.sensorCount} sensor columns, from an uploaded CSV.
              </AlertDescription>
            </Alert>
          )}
          {!hasData && (
            <Alert>
              <Info className="size-4" />
              <AlertTitle>No paired data yet</AlertTitle>
              <AlertDescription>
                Import a paired CSV or generate simulated data below to run the analysis.
              </AlertDescription>
            </Alert>
          )}
          <PairingActions />
        </CardContent>
      </Card>

      {hasData && (
        <>
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            {analysis.patterns.map((p) => (
              <Card key={p.pattern}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {p.pattern}
                    <Badge variant="outline">{p.waferCount} wafers</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!p.sufficientData ? (
                    <p className="text-muted-foreground text-sm">Too few wafers with this pattern to correlate.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sensor</TableHead>
                          <TableHead className="text-right">Correlation</TableHead>
                          <TableHead className="text-right">Mean with / without</TableHead>
                          <TableHead className="text-right">Significant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {p.links.map((l) => (
                          <TableRow key={l.sensorKey}>
                            <TableCell className="font-medium">{l.sensorKey}</TableCell>
                            <TableCell className="text-right tabular-nums">{l.correlation.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-muted-foreground tabular-nums">
                              {l.meanWithPattern.toFixed(2)} / {l.meanWithoutPattern.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={l.significant ? "default" : "outline"}>
                                {l.significant ? "Yes" : "No"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            {analysis.sensorCount} sensors × 8 patterns are tested, so some strong-looking correlations appear by
            chance. &quot;Significant&quot; means p &lt; {analysis.bonferroniThreshold.toExponential(1)} (Bonferroni-
            corrected, normal approximation). Correlation shows association, not cause.
          </p>
        </>
      )}
    </div>
  );
}
