import { AppShell } from "@/components/layout/app-shell";
import { getNotes } from "@/lib/db";
import { NotesClient } from "@/components/domain/notes-client";
export const dynamic = "force-dynamic";
export default async function NotesPage() {
  const notes = await getNotes();
  return (
    <AppShell title="Notes">
      <NotesClient initialNotes={notes} />
    </AppShell>
  );
}
