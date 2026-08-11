"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { saveNote } from "@/lib/db/actions";
export function QuickNotes({
  initialNotes,
}: {
  initialNotes: { id: string; text: string }[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
  async function addNote() {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    const optimistic = { id: crypto.randomUUID(), text };
    setNotes((p) => [optimistic, ...p]);
    try {
      await saveNote({
        title: text,
        content: text,
        tag: "General",
        pinned: false,
      });
    } catch {
      setNotes((p) => p.filter((n) => n.id !== optimistic.id));
    }
  }
  return (
    <Card>
      <CardHeader
        title="Quick Notes"
        action={
          <button
            onClick={addNote}
            className="flex items-center gap-1 text-xs text-accent-blue-soft hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add note
          </button>
        }
      />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && addNote()}
        placeholder="Jot something down…"
        className="w-full mb-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-text-tertiary focus:border-accent-blue/40"
      />
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
