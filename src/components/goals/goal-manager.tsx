"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import type { Mission } from "@/types";
import { LifeAreaKey } from "@/generated/prisma/enums";
import { APP_TIMEZONE, localDateKey } from "@/lib/dates";
import { addGoal, saveGoal, markGoalComplete } from "@/lib/db/actions";

const priorityTone = { low: "neutral", medium: "blue", high: "warning", critical: "danger" } as const;
const deadlineFormat = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, month: "short", day: "numeric", year: "numeric" });
const emptyDraft = { title: "", description: "", category: "" as LifeAreaKey | "", progress: "0", deadline: "" };

export function GoalManager({ missions, overview = false }: { missions: Mission[]; overview?: boolean }) {
  const router = useRouter();
  const saving = useRef(false);
  const [pending, setPending] = useState(false);
  const [editor, setEditor] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function edit(mission?: Mission) {
    if (saving.current) return;
    setError(null);
    setMessage("");
    setEditor(mission?.id ?? "new");
    setDraft(mission ? {
      title: mission.title, description: mission.description ?? "",
      category: mission.category.toUpperCase() as LifeAreaKey,
      progress: String(mission.progress), deadline: mission.deadline ? localDateKey(new Date(mission.deadline)) : "",
    } : emptyDraft);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || !editor) return;
    setError(null);
    const progress = Number(draft.progress);
    if (!draft.title.trim() || draft.title.trim().length > 200 || draft.description.trim().length > 2000 || !draft.progress.trim() || !Number.isInteger(progress) || progress < 0 || progress > 100 || (editor === "new" && !draft.category)) {
      setError("Enter a title (1–200 characters), description up to 2,000 characters, an area, and whole-number progress from 0 to 100. Your input has been kept.");
      return;
    }
    saving.current = true;
    setPending(true);
    try {
      const fields = { title: draft.title, description: draft.description, progress, deadline: draft.deadline || null };
      const saved = editor === "new"
        ? await addGoal({ ...fields, category: draft.category as LifeAreaKey })
        : await saveGoal({ ...fields, id: editor });
      setMessage(`Saved “${saved.title}”.`);
      setEditor(null);
      router.refresh();
    } catch {
      setError("Could not confirm the save. Your input has been kept. Check the goal and its fields before retrying.");
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  async function complete(mission: Mission) {
    if (saving.current) return;
    if (!window.confirm(`Mark “${mission.title}” as complete? You can reopen it from Goals history.`)) return;
    saving.current = true;
    setPending(true);
    setError(null);
    setMessage("");
    try {
      await markGoalComplete(mission.id);
      setMessage(`Completed “${mission.title}”. The record has been retained.`);
      router.refresh();
    } catch {
      setError(`Could not complete “${mission.title}”. Please try again.`);
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  return <Card id={overview ? "missions" : undefined} role="region" aria-label={overview ? "Active Missions" : "Active Goals"}>
    <CardHeader title={overview ? "Active Missions" : "Active Goals"} eyebrow={`${missions.length} ${overview ? "in progress" : "active"}`}
      action={<button disabled={pending || editor !== null} onClick={() => edit()} className="min-h-11 text-xs text-accent-blue-soft disabled:opacity-50">Create Goal</button>} />
    {overview && <Link href="/goals" className="mb-3 inline-block text-xs text-accent-blue-soft hover:underline">View all goals</Link>}
    {editor && <form onSubmit={submit} aria-label={editor === "new" ? "Create Goal" : "Edit Goal"} className="mb-4 rounded-lg border border-white/10 p-3">
      <fieldset disabled={pending} className="grid min-w-0 grid-cols-1 gap-3 text-xs text-text-secondary">
        <div><label htmlFor="goal-title">Title</label><input id="goal-title" name="title" required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="field mt-1 w-full min-w-0" /></div>
        <div><label htmlFor="goal-description">Description (optional)</label><textarea id="goal-description" name="description" rows={2} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="field mt-1 w-full min-w-0 resize-y" /></div>
        <p className="text-text-tertiary">Title up to 200 characters; description up to 2,000.</p>
        {editor === "new" && <div><label htmlFor="goal-category">Area</label><select id="goal-category" name="category" required value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as LifeAreaKey })} className="field mt-1 min-h-11 w-full min-w-0"><option value="">Choose an area</option>{Object.values(LifeAreaKey).map((area) => <option key={area} value={area}>{area.charAt(0) + area.slice(1).toLowerCase()}</option>)}</select></div>}
        <div><label htmlFor="goal-progress">Progress (%)</label><input id="goal-progress" name="progress" type="number" required min={0} max={100} step={1} value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: event.target.value })} className="field mt-1 w-full min-w-0" /></div>
        <div><label htmlFor="goal-deadline">Deadline (optional)</label><input id="goal-deadline" name="deadline" type="date" value={draft.deadline} onChange={(event) => setDraft({ ...draft, deadline: event.target.value })} className="field mt-1 w-full min-w-0" /></div>
        <p className="text-text-tertiary">Use Complete to finish a goal; saving progress does not change its status.</p>
        <div className="flex flex-wrap gap-3"><button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-accent-blue/10 px-3 text-accent-blue-soft disabled:opacity-50">{pending ? "Saving…" : "Save Goal"}</button><button type="button" disabled={pending} onClick={() => { setEditor(null); setError(null); }} className="min-h-11 px-3">Cancel</button></div>
      </fieldset>
    </form>}
    {error && <p role="alert" className="mb-3 text-xs text-danger [overflow-wrap:anywhere]">{error}</p>}
    <p role="status" aria-live="polite" className="mb-3 text-xs text-text-secondary [overflow-wrap:anywhere]">{pending ? "Saving goal…" : message}</p>
    {!missions.length && <p className="text-sm text-text-secondary">No active goals. Create your first goal using Create Goal above.</p>}
    <div className="space-y-3">{missions.map((mission) => <article key={mission.id} className="min-w-0 border-b border-white/10 pb-3 [overflow-wrap:anywhere]">
      <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium text-text-primary">{mission.title}</p><span className="shrink-0 text-xs text-text-secondary">{mission.progress}%</span></div>
      {!overview && mission.description && <p className="my-2 whitespace-pre-wrap text-sm text-text-secondary">{mission.description}</p>}
      {!overview && <p className="my-2 text-xs text-text-secondary">{mission.status.replaceAll("-", " ")} · {mission.priority} priority</p>}
      <ProgressBar percent={mission.progress} height={6} />
      <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-[11px] text-text-tertiary">{mission.category}</span><Badge tone={mission.deadline ? priorityTone[mission.priority] : "neutral"}>{mission.deadline ? deadlineFormat.format(new Date(mission.deadline)) : "No deadline"}</Badge></div>
      <div className="mt-2 flex flex-wrap gap-3"><button disabled={pending || editor !== null} onClick={() => edit(mission)} className="min-h-11 text-xs text-accent-blue-soft disabled:opacity-50">Edit Goal</button><button disabled={pending || editor !== null} onClick={() => complete(mission)} className="min-h-11 text-xs text-success disabled:opacity-50">Complete</button></div>
    </article>)}</div>
  </Card>;
}
