"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Card, CardHeader } from "@/components/ui/card";

export function TaskDonutChart({ taskStatus }: { taskStatus: {name:string;value:number;color:string}[] }) {
  const total = taskStatus.reduce((a, b) => a + b.value, 0);

  return (
    <Card>
      <CardHeader title="Tasks by Status" eyebrow={`${total} tasks · all time`} />
      <div className="relative h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={taskStatus}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={3}
              strokeWidth={0}
            >
              {taskStatus.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#0d1020", border: "1px solid rgba(148,163,255,0.2)", borderRadius: 12, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-display text-xl font-bold text-text-primary">{total}</span>
          <span className="text-[10px] text-text-tertiary">Total</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        {taskStatus.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name} <span className="text-text-tertiary">({s.value})</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
