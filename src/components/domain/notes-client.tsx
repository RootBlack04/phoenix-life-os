"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pin, Search, Plus, Trash2, Save } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { removeNote, saveNote } from "@/lib/db/actions";

interface Note {
  id: string;
  title: string;
  content: string;
  tag: string;
  pinned: boolean;
}

const sameNote = (a: Note, b?: Note) => !!b && a.title === b.title && a.content === b.content && a.tag === b.tag && a.pinned === b.pinned;

const TAGS = [
  "General",
  "Learning",
  "Programming",
  "Career",
  "Spanish",
  "English",
  "Ideas",
  "Wins",
];

function renderMarkdown(md: string) {
  return md.split("\n").map((line, index) => {
    if (line.startsWith("## ")) {
      return (
        <h3
          key={index}
          className="mt-3 mb-1 text-sm font-semibold text-[var(--text-primary)]"
        >
          {line.slice(3)}
        </h3>
      );
    }

    if (line.startsWith("# ")) {
      return (
        <h2
          key={index}
          className="mt-2 mb-1 text-base font-semibold text-[var(--text-primary)]"
        >
          {line.slice(2)}
        </h2>
      );
    }

    if (line.startsWith("- ")) {
      return (
        <div key={index} className="ml-4 text-[var(--text-secondary)]">
          • {line.slice(2)}
        </div>
      );
    }

    if (/^\d+\. /.test(line)) {
      return (
        <div key={index} className="ml-4 text-[var(--text-secondary)]">
          {line}
        </div>
      );
    }

    if (!line) {
      return <br key={index} />;
    }

    return (
      <p key={index} className="leading-relaxed text-[var(--text-secondary)]">
        {line}
      </p>
    );
  });
}

export function NotesClient({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);

  const [activeId, setActiveId] = useState(initialNotes[0]?.id ?? "");

  const [query, setQuery] = useState("");

  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState(initialNotes);
  // Refresh saved records without discarding locally edited drafts.
  if (source !== initialNotes && !pending) {
    const previous = new Map(source.map((note) => [note.id, note]));
    const dirty = notes.filter((note) => !sameNote(note, previous.get(note.id)));
    setNotes([...initialNotes.filter((note) => !dirty.some((draft) => draft.id === note.id)), ...dirty]);
    setSource(initialNotes);
  }

  const active = notes.find((note) => note.id === activeId) ?? notes[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return [...notes]
      .filter((note) => {
        if (!q) return true;

        return (
          note.title.toLowerCase().includes(q) ||
          note.content.toLowerCase().includes(q) ||
          note.tag.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [notes, query]);

  /* =========================================================
     LOCAL STATE
  ========================================================= */

  function updateLocal(id: string, patch: Partial<Note>) {
    setNotes((current) =>
      current.map((note) =>
        note.id === id
          ? {
              ...note,
              ...patch,
            }
          : note,
      ),
    );
  }

  /* =========================================================
     SAVE EXISTING NOTE
  ========================================================= */

  async function persist(id: string, patch: Partial<Note>) {
    if (saving.current) return;
    const current = notes.find((note) => note.id === id);
    if (!current) return;
    const submitted = { ...current, ...patch };
    if (!submitted.title.trim() || submitted.title.trim().length > 120) {
      setError("Use a title between 1 and 120 characters. Your draft is still here.");
      return;
    }
    updateLocal(id, patch);
    saving.current = true;
    setPending(true);
    setError(null);
    try {
      const saved = await saveNote(submitted);
      setNotes((items) => items.map((note) => note.id === id && sameNote(note, submitted) ? saved : note));
      router.refresh();
    } catch {
      setError("The note could not be saved. Your edits remain here and are not yet persisted. Use Save note to retry.");
    } finally { saving.current = false; setPending(false); }
  }

  async function add() {
    if (saving.current) return;
    saving.current = true;
    setPending(true);
    setError(null);
    try {
      const saved = await saveNote({ title: "Untitled note", content: "", tag: "General", pinned: false });
      setNotes((items) => [saved, ...items]);
      setActiveId(saved.id);
      router.refresh();
    } catch { setError("Could not create the note. Please try again."); }
    finally { saving.current = false; setPending(false); }
  }

  async function del(id: string) {
    if (saving.current) return;
    saving.current = true;
    setPending(true);
    setError(null);
    try {
      await removeNote(id);
      setNotes((items) => items.filter((note) => note.id !== id));
      setActiveId((current) => current === id ? "" : current);
      router.refresh();
    } catch { setError("Could not delete the note. It has been kept."); }
    finally { saving.current = false; setPending(false); }
  }

  /* =========================================================
     FIELD SAVE HELPERS
  ========================================================= */

  function saveTitle(value: string) {
    if (!active) return;

    const title = value.trim();

    if (!title) {
      updateLocal(active.id, {
        title: "Untitled note",
      });

      return;
    }

    persist(active.id, {
      title,
    });
  }

  function saveContent(value: string) {
    if (!active) return;

    persist(active.id, {
      content: value,
    });
  }

  function saveTag(value: string) {
    if (!active) return;

    persist(active.id, {
      tag: value,
    });
  }

  function togglePin() {
    if (!active) return;

    persist(active.id, {
      pinned: !active.pinned,
    });
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_1fr]">
      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <Card className="lg:sticky lg:top-24">
        <div className="mb-3 flex items-center gap-2">
          <div className="glass flex flex-1 items-center gap-2 rounded-lg px-3 py-2">
            <Search className="h-3.5 w-3.5 text-text-tertiary" />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notes"
              className="w-full bg-transparent text-xs outline-none placeholder:text-text-tertiary"
            />
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={add}
            aria-label="Create note"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-blue/15 text-accent-blue-soft disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1">
          {filtered.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => setActiveId(note.id)}
              className={cn(
                "w-full rounded-lg p-2.5 text-left transition",
                active?.id === note.id
                  ? "bg-white/[0.08]"
                  : "hover:bg-white/[0.04]",
              )}
            >
              <div className="flex items-center gap-2">
                <p className="flex-1 truncate text-sm text-text-primary">
                  {note.title}
                </p>

                {note.pinned && (
                  <Pin className="h-3 w-3 shrink-0 text-accent-blue-soft" />
                )}
              </div>

              <Badge tone="neutral" className="mt-1">
                {note.tag}
              </Badge>
            </button>
          ))}

          {filtered.length === 0 && (
            <p className="px-2 py-4 text-xs text-text-tertiary">
              No notes found.
            </p>
          )}
        </div>
      </Card>

      {/* =====================================================
          EDITOR
      ====================================================== */}

      <Card>
        {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
        {active ? (
          <>
            {/* Header */}

            <div className="mb-4 flex items-center justify-between gap-3">
              <input
                disabled={pending}
                value={active.title}
                onChange={(event) =>
                  updateLocal(active.id, {
                    title: event.target.value,
                  })
                }
                onBlur={(event) => saveTitle(event.target.value)}
                placeholder="Note title"
                className="flex-1 bg-transparent font-display text-lg font-semibold text-text-primary outline-none"
              />

              <div className="flex items-center gap-1">
                {/* Pin */}

                <button
                  type="button"
                  disabled={pending}
                  onClick={togglePin}
                  aria-label={active.pinned ? "Unpin note" : "Pin note"}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition",
                    active.pinned
                      ? "bg-accent-blue/15 text-accent-blue-soft"
                      : "bg-white/5 text-text-tertiary hover:bg-white/10",
                  )}
                >
                  <Pin className="h-4 w-4" />
                </button>

                {/* Delete */}

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => del(active.id)}
                  aria-label="Delete note"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-text-tertiary hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tag */}

            <div className="mb-4 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-text-tertiary">
                Tag
              </span>

              <select
                value={active.tag}
                disabled={pending}
                onChange={(event) => saveTag(event.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-text-secondary outline-none focus:border-accent-blue/30"
              >
                {!TAGS.includes(active.tag) && (
                  <option value={active.tag}>{active.tag}</option>
                )}

                {TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>

              {pending && (
                <span className="text-[10px] text-text-tertiary">Saving…</span>
              )}
            </div>

            {/* Editor */}

            <textarea
              disabled={pending}
              value={active.content}
              onChange={(event) =>
                updateLocal(active.id, {
                  content: event.target.value,
                })
              }
              onBlur={(event) => saveContent(event.target.value)}
              placeholder="Write your note here..."
              className="min-h-[300px] w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-text-secondary outline-none focus:border-accent-blue/30"
            />

            <button type="button" disabled={pending} onClick={() => persist(active.id, {})} className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-sm disabled:opacity-50">{pending ? "Saving…" : "Save note"}</button>

            {/* Preview */}

            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2">
                <Save className="h-3 w-3 text-text-tertiary" />

                <p className="text-[10px] uppercase tracking-wide text-text-tertiary">
                  Preview
                </p>
              </div>

              <div className="min-h-[100px] space-y-1 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                {active.content ? (
                  renderMarkdown(active.content)
                ) : (
                  <p className="text-sm text-text-tertiary">
                    Nothing to preview yet.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-text-tertiary">No notes yet.</p>

            <button
              type="button"
              onClick={add}
              disabled={pending}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent-blue/15 px-3 py-2 text-xs text-accent-blue-soft hover:bg-accent-blue/20 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Create your first note
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
