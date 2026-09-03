"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from "recharts";

type HealthChartProps = {
  data: {
    day: string;
    hours: number | null;
  }[];
};

export function HealthChart({ data }: HealthChartProps) {
  const observations = data.filter((point) => point.hours !== null);
  if (observations.length < 2) return <p role="status" className="p-4 text-sm text-text-secondary">
    {observations.length === 0 ? "No sleep data recorded yet." : `${observations[0].day}: ${observations[0].hours}h recorded. At least two sleep measurements are needed to show a trend.`}
  </p>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis
          dataKey="day"
          tickFormatter={(day: string) => day.slice(5)}
          stroke="var(--text-tertiary)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />

        <Tooltip
          position={{ x: 12, y: 0 }}
          contentStyle={{
            background: "#0d1020",
            border: "1px solid rgba(148,163,255,0.2)",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(value) => [`${value}h`, "Sleep"]}
        />

        <Line
          type="linear"
          connectNulls={false}
          dot={{ r: 4, fill: "var(--accent-blue-soft)" }}
          isAnimationActive={false}
          dataKey="hours"
          stroke="var(--accent-blue-soft)"
          strokeWidth={2.5}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
