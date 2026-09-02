"use client";

import { dateFromKey, localDateKey } from "@/lib/dates";
import { useRef, useState, useTransition } from "react";
import { addJournalEntry } from "@/lib/db/actions";
import { Card, CardHeader } from "@/components/ui/card";

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
          <option value="1">😔 1 — Very low</option>
          <option value="2">😕 2 — Low</option>
          <option value="3">🙂 3 — Okay</option>
          <option value="4">😀 4 — Good</option>
          <option value="5">🤩 5 — Excellent</option>
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
