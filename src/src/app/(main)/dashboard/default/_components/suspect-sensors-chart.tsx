"use client";

import type { SuspectSensor } from "@prisma/client";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  correlation: {
    label: "Correlation",
    color: "var(--destructive)",
  },
} satisfies ChartConfig;

export function SuspectSensorsChart({ suspects }: { suspects: SuspectSensor[] }) {
  const data = [...suspects]
    .slice(0, 8)
    .reverse()
    .map((s) => ({ sensorKey: s.sensorKey, correlation: Math.abs(s.correlation), rank: s.rank }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top suspect sensors</CardTitle>
        <CardDescription>Ranked by correlation with FAIL outcomes, fab-wide</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No suspect sensors computed yet — run the import script to seed and analyse data.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" dataKey="correlation" hide />
              <YAxis type="category" dataKey="sensorKey" tickLine={false} axisLine={false} width={56} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Bar dataKey="correlation" fill="var(--color-correlation)" radius={4}>
                <LabelList
                  dataKey="correlation"
                  position="right"
                  className="fill-foreground text-xs"
                  formatter={(value: unknown) => (typeof value === "number" ? value.toFixed(3) : "")}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
