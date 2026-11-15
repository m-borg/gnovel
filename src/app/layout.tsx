import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "GNovel — Graphic Novel & Comics Database, Shelf & Diary",
  description:
    "MyAnimeList-inspired database, 1–10 scoring, reading diary, creator profiles, and custom shelves for graphic novels and western comics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
    >
      <body className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <GNovelProvider>
          <Navbar />
          <main className="flex-1 px-0 sm:px-4">{children}</main>
          <footer className="mt-8 border-t border-[#222222] bg-[#121212] py-5 text-[11px] text-[#8A8A8A]">
            <div className="mx-auto max-w-[1080px] px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">GNovel</span>
                <span>·</span>
                <span>Graphic Novel Database &amp; Reading List</span>
              </div>
              <p className="text-center sm:text-right">
                Static-first &amp; GitHub Pages ready · Live ratings, shelves &amp; editions via{" "}
                <a
                  href="https://openlibrary.org"
                  target="_blank"
                  rel="noreferrer"
                  className="mal-link"
                >
                  Open Library
                </a>
              </p>
            </div>
          </footer>
        </GNovelProvider>
      </body>
    </html>
  );
}
