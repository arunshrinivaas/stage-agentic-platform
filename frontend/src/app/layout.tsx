import type { Metadata } from "next";
import "./globals.css";
import { StageStoreProvider } from "@/context/StageStoreContext";

export const metadata: Metadata = {
  title: "STAGE — Where Talent Meets Purpose",
  description:
    "An AI-powered platform connecting performers, stage providers, audiences, and social-impact organisations.",
  keywords: [
    "performance",
    "stage",
    "theatre",
    "music",
    "dance",
    "spoken word",
    "community",
    "social impact",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
        <StageStoreProvider>{children}</StageStoreProvider>
      </body>
    </html>
  );
}
