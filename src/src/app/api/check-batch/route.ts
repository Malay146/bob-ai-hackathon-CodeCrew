import { NextResponse } from "next/server";

import { z } from "zod";

import { checkBatch } from "@/lib/analysis/check-batch";

const bodySchema = z.object({ rawLine: z.string().min(1) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "rawLine is required" }, { status: 400 });
  }

  try {
    const result = await checkBatch(parsed.data.rawLine);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Couldn't parse that line — expected space-separated numbers." },
      { status: 400 },
    );
  }
}
