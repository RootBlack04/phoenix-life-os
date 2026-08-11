"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/card";

export function WeeklyLineChart({ weeklyProgress }: { weeklyProgress: {day:string;score:number;goal:number}[] }) {
  return (
    <Card>
      <CardHeader title="Weekly Progress Overview" eyebrow="This week vs your 70% goal line" />
      <div className="h-[220px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weeklyProgress} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--accent-blue)" />
                <stop offset="100%" stopColor="var(--accent-purple)" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,255,0.08)" vertical={false} />
            <XAxis dataKey="day" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={36} />
            <Tooltip
              contentStyle={{
                background: "#0d1020",
                border: "1px solid rgba(148,163,255,0.2)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--text-primary)" }}
            />
            <Line type="monotone" dataKey="goal" stroke="var(--text-tertiary)" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="url(#lineStroke)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--accent-blue-soft)", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
