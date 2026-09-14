import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ImportForm } from "./_components/import-form";

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import dataset</CardTitle>
        <CardDescription>
          Upload a SECOM-format feature file and its matching label file to replace the current lot data and re-run the
          correlation + risk analysis. This is the UI equivalent of{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run import:secom</code>, for a dataset other than
          the one already seeded.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ImportForm />
      </CardContent>
    </Card>
  );
}
