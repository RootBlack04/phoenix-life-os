"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type MindsetChartProps = {
  data: {
    day: string;
    mood: number;
  }[];
};

export function MindsetChart({ data }: MindsetChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis
          dataKey="day"
          stroke="var(--text-tertiary)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />

        <YAxis domain={[1, 5]} hide />

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
          dataKey="mood"
          stroke="#b58bff"
          strokeWidth={2.5}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
