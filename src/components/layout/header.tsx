"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { APP_TIMEZONE } from "@/lib/dates";

export function Header({ title, user }: { title: string; user: { name: string; streakDays?: number } }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client clock avoids hydration differences
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-border-glass bg-void/70 backdrop-blur-xl px-4 md:px-8">
      <div className="min-w-0">
        <h1 className="font-display text-lg md:text-xl font-semibold text-text-primary truncate">{title}</h1>
        <p className="text-xs text-text-tertiary hidden sm:block">Build skills. Create opportunities.</p>
      </div>
      <div className="ml-auto flex items-center gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-2 glass rounded-xl px-3 py-2 text-xs text-text-secondary">
          <CalendarDays className="h-4 w-4 text-accent-blue-soft" />
          <span className="font-mono-num">{now ? now.toLocaleString("en-GB", { timeZone: APP_TIMEZONE, dateStyle: "medium", timeStyle: "short" }) : "—"}</span>
          <span className="text-text-tertiary">Casablanca</span>
        </div>
        <div aria-label={user.name} className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center text-sm font-semibold text-white shrink-0">
          {user.name.charAt(0)}
        </div>
      </div>
    </header>
  );
}
