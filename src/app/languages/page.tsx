import { AppShell } from "@/components/layout/app-shell";
import { getLanguages } from "@/lib/db";
import { LanguagesClient } from "@/components/domain/languages-client";

export const dynamic = "force-dynamic";

export default async function LanguagesPage() {
  const languages = await getLanguages();

  return (
    <AppShell title="Languages">
      <LanguagesClient initialLanguages={languages} />
    </AppShell>
  );
}
