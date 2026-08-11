"use client";

import { useEffect, useState } from "react";
import { Search, Bell, Sun, Moon, Flame, Sparkles, CalendarDays } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

export function Header({ title, user }: { title: string; user: { name: string; streakDays: number } }) {
  const [now, setNow] = useState<Date | null>(null);
  const [light, setLight] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only clock, avoids SSR/CSR date mismatch
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-border-glass bg-void/70 backdrop-blur-xl px-4 md:px-8">
      <div className="min-w-0">
        <h1 className="font-display text-lg md:text-xl font-semibold text-text-primary truncate">{title}</h1>
        <p className="text-xs text-text-tertiary hidden sm:block">Build skills. Create opportunities.</p>
      </div>

      <div className="hidden lg:flex items-center gap-2 ml-4 flex-1 max-w-sm">
        <div className="glass flex items-center gap-2 rounded-xl px-3 py-2 w-full">
          <Search className="h-4 w-4 text-text-tertiary shrink-0" />
          <input
            placeholder="Search missions, notes, resources…"
            className="bg-transparent outline-none text-sm placeholder:text-text-tertiary w-full"
          />
          <kbd className="text-[10px] text-text-tertiary border border-border-glass rounded px-1.5 py-0.5 shrink-0">⌘K</kbd>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-2 glass rounded-xl px-3 py-2 text-xs text-text-secondary">
          <CalendarDays className="h-4 w-4 text-accent-blue-soft" />
          <span className="font-mono-num">{now ? formatDate(now) : "—"}</span>
          <span className="text-text-tertiary">·</span>
          <span className="font-mono-num">{now ? formatTime(now) : "—"}</span>
        </div>

        <div className="flex items-center gap-1.5 glass rounded-xl px-3 py-2 text-xs">
          <Flame className="h-4 w-4 text-warning" />
          <span className="font-mono-num font-semibold text-text-primary">{user.streakDays}</span>
          <span className="text-text-tertiary hidden sm:inline">day streak</span>
        </div>

        <button className="glass rounded-xl p-2.5 text-text-secondary hover:text-text-primary transition-colors hidden sm:inline-flex" title="Quick actions">
          <Sparkles className="h-4 w-4" />
        </button>

        <button className="glass rounded-xl p-2.5 text-text-secondary hover:text-text-primary transition-colors relative" title="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
        </button>

        <button
          onClick={() => setLight((v) => !v)}
          className="glass rounded-xl p-2.5 text-text-secondary hover:text-text-primary transition-colors"
          title="Toggle theme"
        >
          {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center text-sm font-semibold text-white shrink-0">
          {user.name.charAt(0)}
        </div>
      </div>
    </header>
  );
}
