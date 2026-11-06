import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { brand } from "@/lib/brand";
import { storageMode } from "@/lib/db/store";
import { DemoBanner } from "@/components/ui";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${brand.name} — ${brand.tagline}`, template: `%s · ${brand.name}` },
  description:
    "New property? Let's get you connected. We coordinate electricity and gas connections for homeowners, builders and developers — free.",
};

export const viewport: Viewport = { themeColor: "#0b1b3f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={jakarta.variable}>
      <body className="min-h-dvh font-sans">
        <a href="#main" className="sr-only z-50 rounded-full bg-lime-400 px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          Skip to content
        </a>
        <DemoBanner mode={storageMode()} />
        {children}
      </body>
    </html>
  );
}
