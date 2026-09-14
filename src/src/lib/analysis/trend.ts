import { prisma } from "@/lib/db";

export interface YieldTrendPoint {
  bucket: string;
  yieldPct: number;
  lotCount: number;
}

/**
 * Buckets historical lots (in lot-number order, which follows the dataset's
 * real run timestamps) into fixed-size groups and computes yield % per
 * group — a simple "yield over time" trend without needing dense,
 * evenly-spaced timestamps.
 */
export async function computeYieldTrend(bucketSize = 75): Promise<YieldTrendPoint[]> {
  const lots = await prisma.waferLot.findMany({
    where: { role: "HISTORICAL" },
    orderBy: { lotNumber: "asc" },
    select: { outcome: true },
  });

  const points: YieldTrendPoint[] = [];
  for (let i = 0; i < lots.length; i += bucketSize) {
    const chunk = lots.slice(i, i + bucketSize);
    const passCount = chunk.filter((l) => l.outcome === "PASS").length;
    points.push({
      bucket: `${i + 1}-${i + chunk.length}`,
      yieldPct: Math.round((passCount / chunk.length) * 1000) / 10,
      lotCount: chunk.length,
    });
  }
  return points;
}
