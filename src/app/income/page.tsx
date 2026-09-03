import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { getIncome } from "@/lib/db";
import { IncomeEntryForm, IncomeRecordCard } from "@/components/domain/income-client";

export const dynamic = "force-dynamic";
export default async function IncomePage() {
  const income = await getIncome();
  const total = income.reduce((sum, row) => sum + row.amount, 0);
  const goal = income.reduce((sum, row) => sum + (row.goal ?? 0), 0);
  const percent = goal ? Math.min(100, Math.round(total / goal * 100)) : 0;
  return <AppShell title="Income">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="flex items-center justify-center">
        <ProgressRing percent={percent} size={150} strokeWidth={9} color="var(--accent-blue)" colorTo="var(--accent-pink)">
          <div className="text-center"><p className="font-display text-2xl font-bold text-text-primary">{percent}%</p><p className="text-[10px] text-text-tertiary">Overall target</p></div>
        </ProgressRing>
      </Card>
      <Card className="lg:col-span-2 min-w-0">
        <CardHeader title="Income Sources" eyebrow="Current records" />
        <div className="space-y-4">
          {income.length === 0 && <p className="text-sm text-text-secondary">No income records yet.</p>}
          {income.map((row) => <IncomeRecordCard key={row.id} record={{ id: row.id, source: row.source, amount: row.amount, goal: row.goal, type: row.type, month: row.month.toISOString().slice(0, 7) }} />)}
        </div>
      </Card>
    </div>
    <Card><CardHeader title="Summary" /><div className="grid grid-cols-2 gap-4">
      <div className="glass rounded-xl p-4 min-w-0"><p className="text-xs text-text-tertiary">Total</p><p className="font-display text-2xl font-bold text-text-primary mt-1 break-all">{total.toLocaleString()}</p></div>
      <div className="glass rounded-xl p-4 min-w-0"><p className="text-xs text-text-tertiary">Target</p><p className="font-display text-2xl font-bold text-text-primary mt-1 break-all">{goal.toLocaleString()}</p></div>
    </div></Card>
    <IncomeEntryForm />
  </AppShell>;
}
