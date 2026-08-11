"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";

type HealthChartProps = {
  data: {
    day: string;
    hours: number;
  }[];
};

export function HealthChart({ data }: HealthChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <XAxis
          dataKey="day"
          stroke="var(--text-tertiary)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />

        <Tooltip
          contentStyle={{
            background: "#0d1020",
            border: "1px solid rgba(148,163,255,0.2)",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(value) => [`${value}h`, "Sleep"]}
        />

        <Area
          type="monotone"
          dataKey="hours"
          stroke="var(--accent-blue-soft)"
          fill="var(--accent-blue-soft)"
          fillOpacity={0.12}
          strokeWidth={2.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
