"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { YieldTrendPoint } from "@/lib/analysis/trend";

const chartConfig = {
  yieldPct: {
    label: "Yield %",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function YieldTrendChart({ data }: { data: YieldTrendPoint[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Yield trend</CardTitle>
        <CardDescription>Pass rate across historical lots, grouped by run order</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <AreaChart data={data} margin={{ left: 0, right: 12 }}>
            <defs>
              <linearGradient id="fillYield" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-yieldPct)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-yieldPct)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickMargin={8} width={36} />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <Area
              dataKey="yieldPct"
              type="monotone"
              fill="url(#fillYield)"
              stroke="var(--color-yieldPct)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
