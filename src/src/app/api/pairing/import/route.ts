import { NextResponse } from "next/server";

import { importPairedRows, parsePairedCsv } from "@/lib/pairing/import";

/** Replaces the paired wafer data with an uploaded CSV (wafer_id, defect_pattern, then one column per sensor). */
export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("paired");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A paired CSV file is required." }, { status: 400 });
  }

  try {
    const rows = parsePairedCsv(await file.text());
    const summary = await importPairedRows(rows, false);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Import failed." }, { status: 400 });
  }
}
