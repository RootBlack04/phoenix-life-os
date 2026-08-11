import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { getMindset } from "@/lib/db";
import { format } from "date-fns";
import { MindsetChart } from "@/components/charts/mindset-chart";
import { MindsetEntryForm } from "@/components/domain/mindset-client";

export const dynamic = "force-dynamic";

const moodEmoji = ["", "😔", "😕", "🙂", "😀", "🤩"];

export default async function MindsetPage() {
  const entries = await getMindset();

  const moodTrend = entries
    .slice(0, 7)
    .reverse()
    .map((e) => ({
      day: format(e.date, "EEE"),
      mood: e.mood,
    }));

  return (
    <AppShell title="Mindset">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Journal */}
        <Card className="lg:col-span-2">
          <CardHeader title="Journal" eyebrow="Recent reflections" />

          <div className="space-y-3">
            {entries.map((e) => (
              <div
                key={e.id}
                className="rounded-xl bg-white/[0.03] border border-white/10 p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-text-primary">
                    {e.title}
                  </p>

                  <span className="text-lg">{moodEmoji[e.mood] ?? "🙂"}</span>
                </div>

                <p className="text-xs text-text-tertiary mb-2">
                  {format(e.date, "MMMM d, yyyy")}
                </p>

                <p className="text-sm text-text-secondary">{e.content}</p>
              </div>
            ))}
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
