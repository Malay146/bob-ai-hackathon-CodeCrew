import { NextResponse } from "next/server";

import type { SensorValues } from "@/lib/analysis/types";
import { prisma } from "@/lib/db";
import { toRawLine } from "@/lib/secom/parse";

/** Hands back one real upcoming batch's readings so the "check a batch" form has something to try without hand-typing 590 numbers. */
export async function GET() {
  const count = await prisma.waferLot.count({ where: { role: "UPCOMING" } });
  if (count === 0) {
    return NextResponse.json({ error: "No upcoming batches seeded yet — run npm run import:secom." }, { status: 404 });
  }

  const lot = await prisma.waferLot.findFirstOrThrow({
    where: { role: "UPCOMING" },
    skip: Math.floor(Math.random() * count),
  });

  return NextResponse.json({
    lotNumber: lot.lotNumber,
    actualOutcome: lot.outcome,
    rawLine: toRawLine(lot.sensorValues as SensorValues),
  });
}
