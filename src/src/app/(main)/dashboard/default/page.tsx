import { getOverviewStats } from "@/lib/analysis/overview";
import { computeYieldTrend } from "@/lib/analysis/trend";
import { prisma } from "@/lib/db";

import { KpiCards } from "./_components/kpi-cards";
import { RecentLotsTable } from "./_components/recent-lots-table";
import { SuspectSensorsChart } from "./_components/suspect-sensors-chart";
import { YieldTrendChart } from "./_components/yield-trend-chart";

export default async function Page() {
  const [stats, trend, suspects, recentLots] = await Promise.all([
    getOverviewStats(),
    computeYieldTrend(),
    prisma.suspectSensor.findMany({ orderBy: { rank: "asc" }, take: 8 }),
    prisma.waferLot.findMany({
      where: { role: "HISTORICAL" },
      orderBy: { lotNumber: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <KpiCards stats={stats} />
      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <YieldTrendChart data={trend} />
        </div>
        <SuspectSensorsChart suspects={suspects} />
      </div>
      <RecentLotsTable lots={recentLots} />
    </div>
  );
}
