import { prisma } from "@/lib/db";

export const AT_RISK_THRESHOLD = 60;

export interface OverviewStats {
  totalHistoricalLots: number;
  passCount: number;
  failCount: number;
  yieldPct: number;
  topSuspectSensor: { sensorKey: string; correlation: number } | null;
  upcomingBatchCount: number;
  atRiskBatchCount: number;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const [totalHistoricalLots, failCount, topSuspect, upcomingBatchCount, atRiskBatchCount] = await Promise.all([
    prisma.waferLot.count({ where: { role: "HISTORICAL" } }),
    prisma.waferLot.count({ where: { role: "HISTORICAL", outcome: "FAIL" } }),
    prisma.suspectSensor.findFirst({ orderBy: { rank: "asc" } }),
    prisma.waferLot.count({ where: { role: "UPCOMING" } }),
    prisma.waferLot.count({ where: { role: "UPCOMING", riskScore: { gte: AT_RISK_THRESHOLD } } }),
  ]);

  const passCount = totalHistoricalLots - failCount;
  const yieldPct = totalHistoricalLots > 0 ? (passCount / totalHistoricalLots) * 100 : 0;

  return {
    totalHistoricalLots,
    passCount,
    failCount,
    yieldPct,
    topSuspectSensor: topSuspect ? { sensorKey: topSuspect.sensorKey, correlation: topSuspect.correlation } : null,
    upcomingBatchCount,
    atRiskBatchCount,
  };
}
