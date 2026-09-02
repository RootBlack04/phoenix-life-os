"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { setJobStage } from "@/lib/db/actions";
import { JobStage } from "@/generated/prisma/enums";
import type { JobApplication } from "@/types";
const columns = Object.values(JobStage).map((stage) => ({
  stage,
  key: stage.toLowerCase(),
  label: stage.charAt(0) + stage.slice(1).toLowerCase(),
}));
export function CareerBoard({
  applications,
}: {
  applications: JobApplication[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const saving = useRef(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function selectStage(application: JobApplication, stage: JobStage) {
    if (saving.current || pending || stage.toLowerCase() === application.stage) return;
    saving.current = true;
    setSavingId(application.id);
    setError(null);
    start(async () => {
      try {
        await setJobStage({ id: application.id, stage });
        router.refresh();
      } catch {
        setError(`Could not save the stage for ${application.company}. The displayed stage has not changed. Please try again.`);
      } finally {
        saving.current = false;
        setSavingId(null);
      }
    });
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {error && <p role="alert" className="col-span-full text-xs text-danger">{error}</p>}
      {columns.map((col) => {
        const items = applications.filter((j) => j.stage === col.key);
        return (
          <div key={col.key} className="glass min-w-0 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {col.label}
              </p>
              <span className="text-[11px] text-text-tertiary">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((j) => (
                <article
                  key={j.id}
                  className="min-w-0 w-full text-left rounded-lg bg-white/[0.04] border border-white/10 p-2.5 [overflow-wrap:anywhere]"
                >
                  <p className="text-sm text-text-primary font-medium">
                    {j.company}
                  </p>
                  <p className="text-[11px] text-text-tertiary">{j.role}</p>
                  <p className="text-[10px] text-text-tertiary mt-1">
                    {format(new Date(j.appliedOn), "MMM d")}
                  </p>
                  <label htmlFor={`stage-${j.id}`} className="mt-3 block text-[11px] text-text-secondary">Stage</label>
                  <select
                    id={`stage-${j.id}`}
                    aria-label={`Stage for ${j.company} — ${j.role}`}
                    value={col.stage}
                    disabled={pending}
                    onChange={(event) => selectStage(j, event.target.value as JobStage)}
                    className="field mt-1 min-h-11 w-full min-w-0 text-xs disabled:cursor-wait disabled:opacity-60"
                  >
                    {columns.map((option) => <option key={option.stage} value={option.stage}>{option.label}</option>)}
                  </select>
                  {savingId === j.id && <p role="status" className="mt-1 text-[11px] text-text-tertiary">Saving stage…</p>}
                </article>
              ))}
              {items.length === 0 && (
                <p className="text-[11px] text-text-tertiary italic">
                  No applications
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
