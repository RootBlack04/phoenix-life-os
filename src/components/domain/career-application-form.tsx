"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { JobStage } from "@/generated/prisma/enums";
import { addJobApplication } from "@/lib/db/actions";
import { Card, CardHeader } from "@/components/ui/card";

export function CareerApplicationForm({ today }: { today: string }) {
  const router = useRouter();
  const saving = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState({ company: "", role: "", stage: JobStage.APPLIED as JobStage, appliedOn: today });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    setError(null);
    setMessage("");
    if (!draft.company.trim() || !draft.role.trim() || draft.company.trim().length > 200 || draft.role.trim().length > 200) {
      setError("Company and role must each contain 1–200 characters. Your input has been kept.");
      return;
    }
    saving.current = true;
    setPending(true);
    try {
      const saved = await addJobApplication(draft);
      setDraft({ company: "", role: "", stage: JobStage.APPLIED, appliedOn: today });
      setMessage(`Created application for ${saved.company}.`);
      router.refresh();
    } catch {
      setError("Could not confirm the save. Check your fields and the board before retrying. Your input has been kept.");
      router.refresh();
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  return <Card>
    <CardHeader title="Create Application" eyebrow="Track your job search" />
    <form aria-label="Create Application" onSubmit={submit}>
      <fieldset disabled={pending} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 text-xs text-text-secondary">
          <label htmlFor="application-company">Company</label>
          <input id="application-company" name="company" required value={draft.company}
            onChange={(event) => setDraft({ ...draft, company: event.target.value })}
            aria-describedby="application-text-help" className="field mt-1 w-full min-w-0" />
        </div>
        <div className="min-w-0 text-xs text-text-secondary">
          <label htmlFor="application-role">Role / Position</label>
          <input id="application-role" name="role" required value={draft.role}
            onChange={(event) => setDraft({ ...draft, role: event.target.value })}
            aria-describedby="application-text-help" className="field mt-1 w-full min-w-0" />
        </div>
        <p id="application-text-help" className="text-xs text-text-tertiary sm:col-span-2">Company and role are required · up to 200 characters each.</p>
        <div className="min-w-0 text-xs text-text-secondary">
          <label htmlFor="application-stage">Stage</label>
          <select id="application-stage" name="stage" value={draft.stage}
            onChange={(event) => setDraft({ ...draft, stage: event.target.value as JobStage })}
            className="field mt-1 min-h-11 w-full min-w-0">
            {Object.values(JobStage).map((stage) => <option key={stage} value={stage}>{stage.charAt(0) + stage.slice(1).toLowerCase()}</option>)}
          </select>
        </div>
        <div className="min-w-0 text-xs text-text-secondary">
          <label htmlFor="application-date">Application date</label>
          <input id="application-date" name="appliedOn" type="date" required value={draft.appliedOn}
            onChange={(event) => setDraft({ ...draft, appliedOn: event.target.value })}
            className="field mt-1 min-h-11 w-full min-w-0" />
        </div>
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg border border-accent-blue/25 bg-accent-blue/10 px-4 py-2 text-sm font-medium text-accent-blue-soft hover:bg-accent-blue/15 disabled:cursor-wait disabled:opacity-60 sm:col-span-2">
          {pending ? "Creating…" : "Create Application"}
        </button>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-xs text-danger">{error}</p>}
      <p role="status" aria-live="polite" className="mt-2 text-xs text-text-secondary [overflow-wrap:anywhere]">{message}</p>
    </form>
  </Card>;
}
