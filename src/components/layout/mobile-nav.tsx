"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { LayoutDashboard, ListTodo, Code2, CheckSquare, HeartPulse, Menu } from "lucide-react";
import { navItems, settingsItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

// Destinations/labels come only from shared navigation; placement is mobile-specific.
const primaryIcons = { "/": LayoutDashboard, "/tasks": ListTodo, "/engineering": Code2, "/habits": CheckSquare, "/health": HeartPulse };
const primary = navItems.filter((item) => item.href in primaryIcons);
const more = [...navItems, settingsItem].filter((item) => !(item.href in primaryIcons));

export function MobileNav() {
  const pathname = usePathname();
  const disclosure = useRef<HTMLDetailsElement>(null);
  const moreActive = more.some((item) => item.href === pathname);
  const close = () => { if (disclosure.current) disclosure.current.open = false; };
  return (
    <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border-glass bg-void/95 backdrop-blur-xl">
      <div className="flex items-center justify-between px-2 py-2">
        {primary.map(({ href, label }) => {
          const Icon = primaryIcons[href as keyof typeof primaryIcons];
          return <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={close} className={cn("flex flex-1 min-w-0 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px]", pathname === href ? "text-accent-blue-soft" : "text-text-tertiary")}>
            <Icon className="h-5 w-5" /><span className="max-w-full truncate">{label}</span>
          </Link>;
        })}
        <details ref={disclosure} className="flex-1" onKeyDown={(event) => {
          if (event.key === "Escape") {
            close();
            disclosure.current?.querySelector("summary")?.focus();
          }
        }}>
          <summary className={cn("flex cursor-pointer list-none flex-col items-center gap-1 rounded-xl py-1.5 text-[10px]", moreActive ? "text-accent-blue-soft" : "text-text-tertiary")}><Menu className="h-5 w-5" />More</summary>
          <div className="absolute bottom-full left-2 right-2 mb-2 max-h-[65vh] overflow-y-auto rounded-xl border border-border-glass bg-void p-2 shadow-xl">
            {more.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={close} className={cn("block rounded-lg px-4 py-3 text-sm", pathname === href ? "bg-white/10 text-accent-blue-soft" : "text-text-secondary hover:bg-white/5")}>{label}</Link>)}
          </div>
        </details>
      </div>
    </nav>
  );
}
