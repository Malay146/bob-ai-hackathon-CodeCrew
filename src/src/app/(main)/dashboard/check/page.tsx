import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AT_RISK_THRESHOLD } from "@/lib/analysis/overview";

import { CheckBatchForm } from "./_components/check-batch-form";

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Check a batch</CardTitle>
        <CardDescription>
          Paste one lot&apos;s raw sensor readings (space-separated, SECOM format) to get an instant risk score and
          likely root causes before it runs — the same pipeline used for upcoming batches, run on demand.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CheckBatchForm atRiskThreshold={AT_RISK_THRESHOLD} />
      </CardContent>
    </Card>
  );
}
