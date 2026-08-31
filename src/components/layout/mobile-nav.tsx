"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  Code2,
  HeartPulse,
  CheckSquare,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/engineering", label: "Eng", icon: Code2 },
  { href: "/habits", label: "Habits", icon: CheckSquare },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border-glass bg-void/90 backdrop-blur-xl">
      <div className="flex items-center justify-between px-2 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px]",
                active ? "text-accent-blue-soft" : "text-text-tertiary"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
