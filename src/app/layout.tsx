import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { GNovelProvider } from "@/lib/storage";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GNovel — Graphic Novel Diary & Discovery",
  description:
    "Track the graphic novels, comics, and manga you read. Rate with half-stars, keep a reading diary, and build custom shelves.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} dark`}
    >
      <body className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <GNovelProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-white/10 py-8 mt-16 text-xs text-muted-foreground">
            <div className="container mx-auto max-w-screen-2xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground tracking-tight">GNOVEL</span>
                <span>·</span>
                <span>Graphic Novel Diary &amp; Shelf</span>
              </div>
              <p className="text-center sm:text-right">
                Static-first &amp; GitHub Pages ready. Metadata powered by{" "}
                <a
                  href="https://openlibrary.org"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground/80 hover:text-primary underline underline-offset-4"
                >
                  Open Library
                </a>
                .
              </p>
            </div>
          </footer>
        </GNovelProvider>
      </body>
    </html>
  );
}
