import { AppShell } from "@/components/layout/app-shell";
import { SettingsClient } from "@/components/domain/settings-client";
import { getSettings, getUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, settings] = await Promise.all([getUser(), getSettings()]);

  return (
    <AppShell title="Settings">
      <SettingsClient
        initialUser={{
          name: user.name,
          timezone: user.timezone,
        }}
        initialSettings={{
          theme: settings.theme,
          sidebarCollapsed: settings.sidebarCollapsed,
          dailyMissionReminders: settings.dailyMissionReminders,
          weeklyReviewEmail: settings.weeklyReviewEmail,
          habitStreakAlerts: settings.habitStreakAlerts,
          jobApplicationFollowUps: settings.jobApplicationFollowUps,
          weeklyFocusHours: settings.weeklyFocusHours,
          weeklyScoreGoal: settings.weeklyScoreGoal,
          language: settings.language,
        }}
      />
    </AppShell>
  );
}
