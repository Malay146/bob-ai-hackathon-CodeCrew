import { NextResponse } from "next/server";

import { importSecomDataset } from "@/lib/secom/import";

/**
 * Uploads a SECOM-format feature/label file pair and replaces the current
 * lot data with it — the UI equivalent of `npm run import:secom`, for a
 * dataset other than the one already committed to data-raw/.
 */
export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const featuresFile = formData?.get("features");
  const labelsFile = formData?.get("labels");

  if (!(featuresFile instanceof File) || !(labelsFile instanceof File)) {
    return NextResponse.json({ error: "Both a features file and a labels file are required." }, { status: 400 });
  }

  try {
    const [featureText, labelText] = await Promise.all([featuresFile.text(), labelsFile.text()]);
    const summary = await importSecomDataset(featureText, labelText);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed — check the file format." },
      { status: 400 },
    );
  }
}
