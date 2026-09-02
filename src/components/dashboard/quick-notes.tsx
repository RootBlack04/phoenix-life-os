"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { saveNote } from "@/lib/db/actions";
export function QuickNotes({
  initialNotes,
}: {
  initialNotes: { id: string; text: string }[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [source, setSource] = useState(initialNotes);
  if (source !== initialNotes) {
    setSource(initialNotes);
    setNotes(initialNotes);
  }
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const revision = useRef(0);
  const router = useRouter();
  async function addNote() {
    if (saving.current || !draft.trim()) return;
    const text = draft.trim();
    if (text.length > 120) {
      setError("Quick notes must be 120 characters or fewer. Your text has not been saved or shortened.");
      return;
    }
    const submittedRevision = revision.current;
    saving.current = true;
    setPending(true);
    setError(null);
    try {
      const saved = await saveNote({
        title: text,
        content: text,
        tag: "General",
        pinned: false,
      });
      setNotes((current) => [{ id: saved.id, text: saved.title }, ...current.filter((note) => note.id !== saved.id)]);
      if (revision.current === submittedRevision) setDraft("");
      router.refresh();
    } catch {
      setError("Could not save your note. Your text is still here; please try again.");
    } finally {
      saving.current = false;
      setPending(false);
    }
  }
  return (
    <Card>
      <CardHeader
        title="Quick Notes"
        action={
          <button
            onClick={addNote}
            disabled={pending}
            className="flex items-center gap-1 text-xs text-accent-blue-soft hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> {pending ? "Saving..." : "Add note"}
          </button>
        }
      />
      <input
        value={draft}
        onChange={(e) => { revision.current += 1; setDraft(e.target.value); }}
        aria-label="Quick note"
        aria-describedby="quick-note-help"
        aria-invalid={draft.trim().length > 120}
        onKeyDown={(e) => e.key === "Enter" && addNote()}
        placeholder="Jot something down…"
        className="w-full mb-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-text-tertiary focus:border-accent-blue/40"
      />
      <p id="quick-note-help" className="mb-3 text-xs text-text-tertiary">Up to 120 characters. For longer notes, use the Notes page.</p>
      {error && <p role="alert" className="mb-3 text-xs text-danger">{error}</p>}
      <ul className="space-y-2.5">
        {notes.map((n) => (
          <li
            key={n.id}
            className="flex items-start gap-2 text-sm text-text-secondary"
          >
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-blue shrink-0" />
            {n.text}
          </li>
        ))}
      </ul>
    </Card>
  );
}
