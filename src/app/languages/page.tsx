import { AppShell } from "@/components/layout/app-shell";
import { getLanguages } from "@/lib/db";
import { LanguagesClient } from "@/components/domain/languages-client";
import { mondayKey, weekTimestampRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function LanguagesPage() {
  const languages = await getLanguages();
  const week = weekTimestampRange(mondayKey());

  return (
    <AppShell title="Languages">
      <LanguagesClient initialLanguages={languages} activeWeek={{ start: week.start.toISOString(), endExclusive: week.endExclusive.toISOString() }} />
    </AppShell>
  );
}
