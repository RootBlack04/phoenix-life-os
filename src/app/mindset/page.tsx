import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { getMindset } from "@/lib/db";
import { MindsetChart } from "@/components/charts/mindset-chart";
import { JournalEntryCard, MindsetEntryForm } from "@/components/domain/mindset-client";

export const dynamic = "force-dynamic";


export default async function MindsetPage() {
  const entries = await getMindset();

  const moodTrend = entries
    .slice(0, 7)
    .reverse()
    .map((e) => ({
      day: e.date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" }),
      mood: e.mood,
    }));

  return (
    <AppShell title="Mindset">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Journal */}
        <Card className="lg:col-span-2 min-w-0">
          <CardHeader title="Journal" eyebrow="Recent reflections" />

          <div className="space-y-3">
            {entries.length === 0 && <p className="text-sm text-text-secondary">No journal entries yet. Add a reflection to get started.</p>}
            {entries.map((e) => <JournalEntryCard key={e.id} entry={{ id: e.id, title: e.title, content: e.content, mood: e.mood, date: e.date.toISOString().slice(0, 10) }} />)}
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* Mood Tracker */}
          <Card>
            <CardHeader title="Mood Tracker" eyebrow="Recent entries" />

            <div className="h-[180px] -ml-4">
              <MindsetChart data={moodTrend} />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-xs text-text-tertiary mb-1">Entries</p>

                <p className="font-display text-lg font-bold text-text-primary">
                  {entries.length}
                </p>
              </div>

              <div className="glass rounded-xl p-3 text-center">
                <p className="text-xs text-text-tertiary mb-1">Avg mood</p>

                <p className="font-display text-lg font-bold text-text-primary">
                  {entries.length
                    ? (
                        entries.reduce((s, e) => s + e.mood, 0) / entries.length
                      ).toFixed(1)
                    : "—"}
                  /5
                </p>
              </div>
            </div>
          </Card>

          {/* New Journal Form */}
          <MindsetEntryForm />
        </div>
      </div>
    </AppShell>
  );
}
