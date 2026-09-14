import { NextResponse } from "next/server";

import { recomputeUpcomingBatchRisk } from "@/lib/analysis/risk";
import { computeSuspectSensors } from "@/lib/analysis/root-cause";
import { prisma } from "@/lib/db";

/** Re-runs the fab-wide correlation + upcoming-batch risk scoring from scratch, clearing per-lot caches so detail pages recompute against the fresh suspect list. */
export async function POST() {
  await prisma.rootCauseFinding.deleteMany();
  const suspects = await computeSuspectSensors();
  const scoredCount = await recomputeUpcomingBatchRisk();

  return NextResponse.json({
    suspectCount: suspects.length,
    topSuspect: suspects[0] ?? null,
    scoredCount,
  });
}
