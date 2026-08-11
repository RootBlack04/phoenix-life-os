import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phoenix Life OS — Dashboard",
  description: "Build skills. Create opportunities. A personal life operating system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
