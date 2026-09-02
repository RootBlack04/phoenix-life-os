import { Card, CardHeader } from "@/components/ui/card";
import type { MonthlyWeek } from "@/types";

export function MonthlyProgress({ monthlyProgress }: { monthlyProgress: MonthlyWeek[] }) {
  const scored = monthlyProgress.filter((week): week is { label: string; score: number } => week.score !== null);
  const best = scored.length ? scored.reduce((a, b) => b.score > a.score ? b : a) : null;
  const monthly = scored.length ? Math.round(scored.reduce((sum, week) => sum + week.score, 0) / scored.length) : null;
  return <Card>
    <CardHeader title="Monthly Progress" eyebrow="Recorded daily metrics · this month" />
    <div className="space-y-2.5 mb-4">{monthlyProgress.map((week) => <div key={week.label} className="flex items-center gap-3">
      <span className="text-xs text-text-tertiary w-14 shrink-0">{week.label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">{week.score !== null && <div className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-purple" style={{ width: week.score + "%" }} />}</div>
      <span className="font-mono-num text-xs text-text-secondary w-8 text-right">{week.score === null ? "—" : week.score + "%"}</span>
    </div>)}</div>
    {monthly === null ? <p className="text-sm text-text-tertiary">No daily metrics recorded this month.</p> : <div className="grid grid-cols-2 gap-3">
      <div className="glass rounded-xl p-3 text-center"><p className="text-[10px] text-text-tertiary">Average of tracked week buckets</p><p className="font-display text-2xl font-bold text-gradient">{monthly}%</p></div>
      <div className="glass rounded-xl p-3 text-center"><p className="text-[10px] text-text-tertiary">Best week bucket</p><p className="font-display text-2xl font-bold text-text-primary">{best?.score}%</p><p className="text-[10px] text-text-tertiary">{best?.label}</p></div>
    </div>}
  </Card>;
}
