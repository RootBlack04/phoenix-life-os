"use client";

import { dateFromKey } from "@/lib/dates";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveHealth } from "@/lib/db/actions";
import { CardHeader } from "@/components/ui/card";

const fields = [
  { key: "weight", label: "Weight kg", step: "any", min: "0" },
  { key: "sleep", label: "Sleep h", step: "any", min: "0" },
  { key: "water", label: "Water L", step: "any", min: "0" },
  { key: "steps", label: "Steps", step: "1", min: "0" },
  { key: "workouts", label: "Workouts", step: "1", min: "0" },
  { key: "heartRate", label: "Resting HR", step: "1", min: "1" },
] as const;
type Measurement = typeof fields[number]["key"];
type Entry = Record<Measurement, number | null>;

export function HealthEntryForm({ date, today, entry }: { date: string; today: string; entry: Entry | null }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const label = dateFromKey(date).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });

  return <>
    <CardHeader title="Log Health" eyebrow={`Health entry for ${label}`} />
    <label className="block text-xs text-text-secondary mb-4">Health date
      <input aria-label="Health date" className="field mt-1 w-full min-w-0" type="date" value={date} max={today} disabled={pending}
        onChange={(event) => {
          const day = event.target.value;
          if (!day || day > today) { setError("Choose a valid date no later than today."); return; }
          setError(null);
          start(() => router.replace(`/health?date=${day}`, { scroll: false }));
        }} />
    </label>
    <p className="mb-3 text-xs text-text-secondary">{entry ? "Edit saved measurements. Clear a value to remove that measurement." : "No health entry for this date yet."}</p>
    <form aria-label="Health entry" className="grid grid-cols-2 gap-3" onSubmit={(event) => {
      event.preventDefault();
      if (pending || busy.current) return;
      const formData = new FormData(event.currentTarget);
      const changes: Partial<Entry> = {};
      for (const { key } of fields) {
        const raw = String(formData.get(key) ?? "").trim();
        const value = raw === "" ? null : Number(raw);
        if (value !== (entry?.[key] ?? null)) changes[key] = value;
      }
      setError(null);
      if (!Object.keys(changes).length) { setError("Change at least one measurement before saving."); return; }
      busy.current = true;
      start(async () => {
        try {
          await saveHealth({ date, ...changes });
          router.refresh();
        } catch {
          setError("Could not save. Check the date and measurements, then try again. Your input has been kept.");
        } finally { busy.current = false; }
      });
    }}>
      {fields.map(({ key, label: fieldLabel, ...constraints }) => <label key={key} className="min-w-0 text-xs text-text-secondary">{fieldLabel}
        <input disabled={pending} name={key} type="number" {...constraints} defaultValue={entry?.[key] ?? ""} className="field mt-1 w-full min-w-0" />
      </label>)}
      <button disabled={pending} className="col-span-full rounded-lg bg-gradient-to-r from-accent-blue to-accent-purple px-4 py-2 text-sm font-medium text-white">{pending ? "Saving / loading…" : "Save metrics"}</button>
    </form>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  </>;
}
