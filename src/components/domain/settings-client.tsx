"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Layout } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveSettings } from "@/lib/db/actions";

type Theme = "AURORA" | "SUNSET" | "FOREST";

type Language = "ENGLISH" | "SPANISH" | "FRENCH" | "ARABIC";

type SettingsState = {
  theme: Theme;
  sidebarCollapsed: boolean;

  dailyMissionReminders: boolean;
  weeklyReviewEmail: boolean;
  habitStreakAlerts: boolean;
  jobApplicationFollowUps: boolean;

  weeklyFocusHours: number;
  weeklyScoreGoal: number;

  language: Language;
};

type Props = {
  initialUser: {
    name: string;
    timezone: string;
  };

  initialSettings: SettingsState;
};

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors shrink-0",
        checked
          ? "bg-gradient-to-r from-accent-blue to-accent-purple"
          : "bg-white/10",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function SettingsClient({ initialUser, initialSettings }: Props) {
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(initialUser.name);
  const timezone = initialUser.timezone;

  const [settings, setSettings] = useState(initialSettings);

  const [saved, setSaved] = useState(false);

  const updateSidebarCollapsed = (value: boolean) => {
    setSettings((current) => ({
      ...current,
      sidebarCollapsed: value,
    }));

    setSaved(false);
  };

  const handleSave = () => {
    setSaved(false);

    startTransition(async () => {
      await saveSettings({
        name,
        timezone,
        ...settings,
      });

      setSaved(true);
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <Card>
          <CardHeader title="Profile" eyebrow="Your identity" />

          <div className="flex items-center gap-4 mb-5">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center text-xl font-semibold text-white shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>

            <div>
              <p className="font-display text-base font-semibold text-text-primary">
                {name}
              </p>

              <p className="text-xs text-text-tertiary">{timezone}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-tertiary block mb-1.5">
                Display name
              </label>

              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                }}
                className="field"
              />
            </div>
          </div>
        </Card>

        {/* Layout */}
        <Card>
          <CardHeader
            title="Layout"
            eyebrow="Desktop navigation"
            action={<Layout className="h-4 w-4 text-text-tertiary" />}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Layout className="h-4 w-4 text-text-tertiary" />
              Collapsed sidebar by default
            </div>

            <Toggle
              checked={settings.sidebarCollapsed}
              onChange={updateSidebarCollapsed}
            />
          </div>
        </Card>
      </div>

      {/* Save */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent-blue to-accent-purple px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save settings"}
          </button>

          {saved && (
            <span className="text-xs text-emerald-400">
              Settings saved successfully.
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
