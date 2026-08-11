import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getUser } from "@/lib/db";

export async function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header title={title} user={{ name: user.name, streakDays: user.streakDays }} />
        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6">
          {children}
        </main>
        <footer className="hidden md:flex items-center justify-center gap-2 py-4 text-[11px] text-text-tertiary border-t border-border-glass">
          <span className="text-gradient font-display font-semibold">Focus — Plan — Execute — Review — Grow</span>
          <span>·</span>
          <span>Be patient. Be consistent. Be unstoppable.</span>
        </footer>
      </div>
      <MobileNav />
    </div>
  );
}
