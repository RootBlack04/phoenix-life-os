"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from "recharts";

type LanguageChartProps = {
  data: {
    week: string;
    score: number;
  }[];
};

export function LanguageChart({ data }: LanguageChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis
          dataKey="week"
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
        />

        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--accent-blue-soft)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
