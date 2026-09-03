"use client";
import { dateFromKey, localDateKey } from "@/lib/dates";
import { useRef, useState, useTransition } from "react";
import { addIncome, editIncome } from "@/lib/db/actions";
import { IncomeType } from "@/generated/prisma/enums";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Card, CardHeader } from "@/components/ui/card";
type IncomeRecord = { id: string; source: string; amount: number; goal: number | null; type: IncomeType; month: string };
const typeLabel = (value: string) => value.toLowerCase().replaceAll("_", " ");

export function IncomeRecordCard({ record }: { record: IncomeRecord }) {
  const router = useRouter();
  const busy = useRef(false);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return <article aria-label={`Income record ${record.source}`} className="min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
      <p className="text-sm text-text-primary break-words min-w-0">{record.source}</p>
      <span className="font-mono-num text-sm text-text-secondary break-all">{record.amount.toLocaleString()} / {(record.goal ?? 0).toLocaleString()}</span>
    </div>
    <ProgressBar percent={record.goal ? Math.min(100, Math.round(record.amount / record.goal * 100)) : 0} />
    <div className="flex flex-wrap justify-between gap-2 mt-2 text-xs text-text-secondary">
      <span className="capitalize">{typeLabel(record.type)} · {record.month}</span>
      {!editing && <button onClick={() => { setError(null); setEditing(true); }} className="text-accent-blue-soft hover:underline">Edit</button>}
    </div>
    {editing && <form aria-label="Edit income" className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3" onSubmit={(event) => {
      event.preventDefault();
      if (pending || busy.current) return;
      const fd = new FormData(event.currentTarget);
      const amount = String(fd.get("amount") ?? "").trim();
      const source = String(fd.get("source") ?? "").trim();
      const goal = String(fd.get("goal") ?? "").trim();
      const month = String(fd.get("month") ?? "");
      setError(null);
      if (!source || !amount || !month) { setError("Source, amount and month are required."); return; }
      busy.current = true;
      start(async () => {
        try {
          await editIncome({ id: record.id, source, amount: Number(amount), goal: goal === "" ? null : Number(goal), type: String(fd.get("type")) as IncomeType, ...(month !== record.month ? { month } : {}) });
          setEditing(false);
          router.refresh();
        } catch { setError("Could not save. Check your values and try again. Your edits have been kept."); }
        finally { busy.current = false; }
      });
    }}>
      <label className="min-w-0 text-xs">Source<input name="source" required disabled={pending} defaultValue={record.source} className="field mt-1 w-full min-w-0" /></label>
      <label className="min-w-0 text-xs">Amount<input name="amount" type="number" required min="0" step="any" disabled={pending} defaultValue={record.amount} className="field mt-1 w-full min-w-0" /></label>
      <label className="min-w-0 text-xs">Goal (optional)<input name="goal" type="number" min="0" step="any" disabled={pending} defaultValue={record.goal ?? ""} className="field mt-1 w-full min-w-0" /></label>
      <label className="min-w-0 text-xs">Type<select aria-label="Type" name="type" disabled={pending} defaultValue={record.type} className="field mt-1 w-full min-w-0">{Object.values(IncomeType).map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}</select></label>
      <label className="min-w-0 text-xs">Month<input name="month" type="month" required disabled={pending} defaultValue={record.month} className="field mt-1 w-full min-w-0" /></label>
      <div className="md:col-span-2 flex flex-wrap gap-3">
        <button disabled={pending} className="rounded-lg bg-gradient-to-r from-accent-blue to-accent-purple px-4 py-2 text-sm text-white">{pending ? "Saving…" : "Save changes"}</button>
        <button type="button" disabled={pending} onClick={() => { setEditing(false); setError(null); }} className="text-sm text-text-secondary">Cancel</button>
      </div>
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  </article>;
}
export function IncomeEntryForm(){const form=useRef<HTMLFormElement>(null);const [pending,start]=useTransition();const [error,setError]=useState<string|null>(null);return <Card><CardHeader title="Add Income" eyebrow="Persist a new income record"/><form ref={form} className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={event=>{event.preventDefault();if(pending)return;const fd=new FormData(event.currentTarget);setError(null);const num=(k:string)=>{const v=fd.get(k);return v?Number(v):undefined};start(async()=>{try{await addIncome({source:String(fd.get("source")),amount:Number(fd.get("amount")),goal:num("goal"),type:String(fd.get("type")) as "FREELANCE"|"REMOTE_JOB"|"SAVINGS"|"OTHER",month:dateFromKey(localDateKey(new Date()))});form.current?.reset();}catch{setError("Could not save. Your input has been kept; please try again.");}});}}><input disabled={pending} name="source" required placeholder="Source" className="field"/><input disabled={pending} name="amount" required type="number" step="0.01" placeholder="Amount" className="field"/><input disabled={pending} name="goal" type="number" step="0.01" placeholder="Goal" className="field"/><select disabled={pending} name="type" defaultValue="FREELANCE" className="field"><option value="FREELANCE">Freelance</option><option value="REMOTE_JOB">Remote Job</option><option value="SAVINGS">Savings</option><option value="OTHER">Other</option></select><button disabled={pending} className="md:col-span-2 rounded-lg bg-gradient-to-r from-accent-blue to-accent-purple px-4 py-2 text-sm font-medium text-white">{pending?"Saving…":"Add income"}</button></form>{error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}</Card>;}
