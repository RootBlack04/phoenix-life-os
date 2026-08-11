"use client";

import { useRef, useTransition } from "react";
import { addJournalEntry } from "@/lib/db/actions";
import { Card, CardHeader } from "@/components/ui/card";

export function MindsetEntryForm() {
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardHeader title="New Reflection" eyebrow="Log today's mindset" />

      <form
        ref={form}
        className="space-y-3"
        action={(formData) => {
          const mood = Number(formData.get("mood"));

          start(async () => {
            await addJournalEntry({
              title: String(formData.get("title")),
              content: String(formData.get("content")),
              mood,
              date: new Date(),
            });

            form.current?.reset();
          });
        }}
      >
        <input
          name="title"
          required
          placeholder="Reflection title"
          className="field"
        />

        <textarea
          name="content"
          required
          rows={5}
          placeholder="How was your day?"
          className="field resize-none"
        />

        <select name="mood" defaultValue="3" className="field">
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
    </Card>
  );
}
