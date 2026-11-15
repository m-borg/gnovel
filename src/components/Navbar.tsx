"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookMarked,
  CalendarDays,
  Database,
  ListChecks,
  Plus,
  Search,
} from "lucide-react";
import { LogModal } from "./LogModal";
import { BackupModal } from "./BackupModal";
import { useGNovel } from "@/lib/storage";
import { cn } from "@/lib/utils";

const BLUE_BAR_LINKS = [
  { href: "/", label: "Graphic Novels" },
  { href: "/shelf/", label: "My Shelf" },
  { href: "/diary/", label: "Diary" },
  { href: "/lists/", label: "Lists" },
];

export function Navbar() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { state, mounted } = useGNovel();

  const [logOpen, setLogOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  const [navScope, setNavScope] = useState<"all" | "comics" | "manga" | "curated">("all");

  const trackedCount = mounted ? Object.keys(state.library).length : 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = navSearch.trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (navScope !== "all") params.set("scope", navScope);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  return (
    <>
      <header className="w-full bg-[#121212] border-b border-[#2A2A2A]">
        <div className="mx-auto max-w-[1080px] px-3 sm:px-4">
          {/* Top Bar (MAL Dark Header) */}
          <div className="flex h-12 items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-bold text-xl tracking-tight text-white">
                GNovel
              </span>
              <span className="hidden sm:inline-block rounded bg-[#2E51A2] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Comics DB
              </span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3 text-xs">
              <Link
                href="/shelf/"
                className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[#CCCCCC] hover:bg-[#222222] hover:text-white transition-colors"
                title="My Shelf"
              >
                <ListChecks className="h-4 w-4" />
                <span className="hidden sm:inline">Shelf</span>
                {trackedCount > 0 && (
                  <span className="rounded bg-[#2E51A2] px-1.5 py-0.2 font-mono text-[10px] font-bold text-white">
                    {trackedCount}
                  </span>
                )}
              </Link>

              <Link
                href="/diary/"
                className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[#CCCCCC] hover:bg-[#222222] hover:text-white transition-colors"
                title="Reading Diary"
              >
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Diary</span>
              </Link>

              <button
                type="button"
                onClick={() => setBackupOpen(true)}
                className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[#CCCCCC] hover:bg-[#222222] hover:text-white transition-colors"
                title="Backup / Export JSON / Sample Data"
              >
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Backup</span>
              </button>

              <button
                type="button"
                onClick={() => setLogOpen(true)}
                className="inline-flex items-center gap-1 rounded bg-[#2E51A2] hover:bg-[#3A62BE] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Log Read</span>
              </button>
            </div>
          </div>

          {/* Signature MAL Royal Blue Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#2E51A2] px-2.5 py-1.5 rounded-t-[2px]">
            <nav className="flex items-center gap-0.5 overflow-x-auto">
              {BLUE_BAR_LINKS.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href.replace(/\/$/, ""));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "shrink-0 px-2.5 py-1 text-xs font-bold tracking-tight transition-colors rounded-[3px]",
                      active
                        ? "bg-[#1A3168] text-white"
                        : "text-white/95 hover:bg-[#3B61BA] hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/novel/?id=akira"
                className={cn(
                  "hidden md:inline-block shrink-0 px-2.5 py-1 text-xs font-bold tracking-tight transition-colors rounded-[3px]",
                  pathname.startsWith("/novel")
                    ? "bg-[#1A3168] text-white"
                    : "text-white/85 hover:bg-[#3B61BA] hover:text-white"
                )}
              >
                <span className="inline-flex items-center gap-1">
                  <BookMarked className="h-3 w-3" />
                  Entry View
                </span>
              </Link>
            </nav>

            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center sm:w-[340px] rounded-[3px] overflow-hidden border border-[#1B336B] bg-[#141414]"
            >
              <select
                value={navScope}
                onChange={(e) =>
                  setNavScope(
                    e.target.value as "all" | "comics" | "manga" | "curated"
                  )
                }
                aria-label="Search scope"
                className="h-7 shrink-0 border-r border-[#2C2C2C] bg-[#1D1D1D] px-2 text-[11px] font-medium text-[#E5E5E5] focus:outline-none"
              >
                <option value="all">All</option>
                <option value="comics">Comics &amp; GNs</option>
                <option value="manga">Manga &amp; Manhwa</option>
                <option value="curated">Curated Top</option>
              </select>
              <input
                type="search"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Search Graphic Novels, Manga, and more..."
                className="h-7 w-full bg-[#141414] px-2.5 text-xs text-white placeholder:text-[#8A8A8A] focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Search"
                className="flex h-7 w-8 shrink-0 items-center justify-center border-l border-[#2C2C2C] bg-[#222222] text-white hover:bg-[#333333] transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <LogModal open={logOpen} onClose={() => setLogOpen(false)} />
      <BackupModal open={backupOpen} onClose={() => setBackupOpen(false)} />
    </>
  );
}
