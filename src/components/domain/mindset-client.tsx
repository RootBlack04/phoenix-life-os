"use client";

import { dateFromKey, localDateKey } from "@/lib/dates";
import { useRef, useState, useTransition } from "react";
import { addJournalEntry, editJournalEntry, removeJournalEntry } from "@/lib/db/actions";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";

const moods = ["😔 1 — Very low", "😕 2 — Low", "🙂 3 — Okay", "😀 4 — Good", "🤩 5 — Excellent"];
type JournalRecord = { id: string; title: string; content: string; mood: number; date: string };

export function JournalEntryCard({ entry }: { entry: JournalRecord }) {
  const router = useRouter();
  const busy = useRef(false);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<void>, failure: string) => {
    if (pending || busy.current) return;
    busy.current = true;
    setError(null);
    start(async () => {
      try { await action(); setEditing(false); router.refresh(); }
      catch { setError(failure); }
      finally { busy.current = false; }
    });
  };
  return <article aria-label={`Journal entry ${entry.title}`} aria-busy={pending} className="min-w-0 rounded-xl bg-white/[0.03] border border-white/10 p-4">
    <div className="flex flex-wrap justify-between gap-2 mb-1">
      <p className="min-w-0 break-words text-sm font-semibold text-text-primary">{entry.title}</p>
      <span className="text-xs text-text-secondary">{moods[entry.mood - 1] ?? `Mood ${entry.mood}/5`}</span>
    </div>
    <p className="text-xs text-text-tertiary mb-2"><time dateTime={entry.date}>{dateFromKey(entry.date).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })}</time></p>
    <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">{entry.content}</p>
    <div className="flex gap-4 mt-3 text-xs">
      {!editing && <button disabled={pending} onClick={() => { setError(null); setEditing(true); }} className="text-accent-blue-soft">Edit</button>}
      <button disabled={pending} className="text-danger" onClick={() => {
        if (pending || busy.current) return;
        if (!window.confirm(`Permanently delete "${entry.title}" (${entry.date})? This cannot be undone.`)) return;
        run(() => removeJournalEntry(entry.id), "Could not confirm deletion. The entry is still shown; please refresh or try again.");
      }}>Delete</button>
      {pending && <span role="status">Saving changes…</span>}
    </div>
    {editing && <form aria-label="Edit journal entry" className="space-y-3 mt-3" onSubmit={(event) => {
      event.preventDefault();
      if (pending || busy.current) return;
      const fd = new FormData(event.currentTarget);
      run(() => editJournalEntry({ id: entry.id, title: String(fd.get("title") ?? ""), content: String(fd.get("content") ?? ""), mood: Number(fd.get("mood")), date: String(fd.get("date") ?? "") }), "Could not save. Check your values and try again. Your edits have been kept.");
    }}>
      <label className="block text-xs">Title<input name="title" required maxLength={120} disabled={pending} defaultValue={entry.title} className="field mt-1 w-full min-w-0" /></label>
      <label className="block text-xs">Reflection<textarea aria-label="Reflection" name="content" required maxLength={20000} rows={5} disabled={pending} defaultValue={entry.content} className="field mt-1 w-full min-w-0 resize-y" /></label>
      <label className="block text-xs">Mood<select aria-label="Mood" name="mood" disabled={pending} defaultValue={entry.mood} className="field mt-1 w-full min-w-0">{moods.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</select></label>
      <label className="block text-xs">Date<input name="date" type="date" required disabled={pending} defaultValue={entry.date} className="field mt-1 w-full min-w-0" /></label>
      <div className="flex flex-wrap gap-3"><button disabled={pending} className="rounded-lg bg-gradient-to-r from-accent-blue to-accent-purple px-4 py-2 text-sm text-white">{pending ? "Saving…" : "Save changes"}</button><button type="button" disabled={pending} onClick={() => { setEditing(false); setError(null); }} className="text-sm text-text-secondary">Cancel</button></div>
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  </article>;
}

export function MindsetEntryForm() {
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader title="New Reflection" eyebrow="Log today's mindset" />

      <form
        ref={form}
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const formData = new FormData(event.currentTarget);
          setError(null);
          const mood = Number(formData.get("mood"));

          start(async () => {
            try {
            await addJournalEntry({
              title: String(formData.get("title")),
              content: String(formData.get("content")),
              mood,
              date: dateFromKey(localDateKey(new Date())),
            });

            form.current?.reset();
            } catch { setError("Could not save. Your input has been kept; please try again."); }
          });
        }}
      >
        <input
          disabled={pending}
          name="title"
          required
          placeholder="Reflection title"
          className="field"
        />

        <textarea
          disabled={pending}
          name="content"
          required
          rows={5}
          placeholder="How was your day?"
          className="field resize-none"
        />

        <select disabled={pending} name="mood" defaultValue="3" className="field">
          {moods.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
        </select>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-gradient-to-r from-accent-blue to-accent-purple px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save reflection"}
        </button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </Card>
  );
}
