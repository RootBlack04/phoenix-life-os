"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ListTodo,
  MessageCircle,
  Code2,
  Briefcase,
  CircleDollarSign,
  HeartPulse,
  BrainCircuit,
  CheckSquare,
  BookOpen,
  StickyNote,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Flame,
} from "lucide-react";
import { navItems, settingsItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

const icons = {
  LayoutDashboard,
  ListTodo,
  MessageCircle,
  Code2,
  Briefcase,
  CircleDollarSign,
  HeartPulse,
  BrainCircuit,
  CheckSquare,
  BookOpen,
  StickyNote,
  Settings,
};

export function Sidebar({ initialCollapsed }: { initialCollapsed: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 h-screen sticky top-0 border-r border-border-glass bg-panel/60 backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-[76px]" : "w-[248px]"
      )}
    >
      <div className="flex items-center gap-3 px-5 h-20 shrink-0">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple shrink-0">
          <Flame className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="leading-tight overflow-hidden">
            <p className="font-display text-[13px] font-bold tracking-wide text-text-primary whitespace-nowrap">
              PHOENIX
            </p>
            <p className="font-display text-[11px] font-semibold tracking-widest text-gradient whitespace-nowrap">
              LIFE OS
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = icons[item.icon];
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
              )}
            >
              {active && (
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent-blue/15 to-accent-purple/10 border border-accent-blue/25" />
              )}
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gradient-to-b from-accent-blue to-accent-purple" />
              )}
              <Icon className="relative h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="relative whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-border-glass space-y-1">
        {(() => {
          const Icon = icons[settingsItem.icon];
          const active = pathname === settingsItem.href;
          return (
            <Link
              href={settingsItem.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active ? "text-text-primary bg-white/5" : "text-text-secondary hover:text-text-primary hover:bg-white/5"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{settingsItem.label}</span>}
            </Link>
          );
        })()}
        <button className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary hover:text-danger hover:bg-danger/5 transition-colors">
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronsRight className="h-[18px] w-[18px]" /> : <ChevronsLeft className="h-[18px] w-[18px]" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
