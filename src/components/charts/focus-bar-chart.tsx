"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";
import { Card, CardHeader } from "@/components/ui/card";

export function FocusBarChart({ focusTime }: { focusTime: {day:string;hours:number}[] }) {
  const total = focusTime.reduce((a, b) => a + b.hours, 0);
  const h = Math.floor(total);
  const m = Math.round((total - h) * 60);

  return (
    <Card>
      <CardHeader title="Focus Time" eyebrow="Recorded daily metrics · last 7 calendar days" action={<span className="font-mono-num text-sm font-semibold text-text-primary">{focusTime.length ? `${h}h ${m}m` : "—"}</span>} />
      {focusTime.length === 0 && <p className="text-sm text-text-tertiary">No focus records in this period.</p>}
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={focusTime} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(148,163,255,0.06)" }}
              contentStyle={{ background: "#0d1020", border: "1px solid rgba(148,163,255,0.2)", borderRadius: 12, fontSize: 12 }}
              formatter={(v) => [`${v}h`, "Focus"]}
            />
            <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
              {focusTime.map((entry, i) => (
                <Cell key={i} fill={i === focusTime.length - 3 ? "var(--accent-purple)" : "var(--accent-blue)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
