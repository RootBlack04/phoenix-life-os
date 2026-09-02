"use client";
import Link from "next/link";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="min-h-screen flex items-center justify-center p-6">
    <div role="alert" className="glass rounded-xl p-6 max-w-md space-y-4">
      <h1 className="text-xl font-semibold">This page could not be loaded</h1>
      <p className="text-sm text-text-secondary">The connection or service may be temporarily unavailable. Please try again.</p>
      <button onClick={retry} className="rounded-lg bg-white/10 px-4 py-2">Try again</button>
      <Link href="/" className="ml-4 text-sm text-accent-blue-soft">Overview</Link>
    </div>
  </main>;
}
