"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  CalendarDays,
  Compass,
  Database,
  Layers,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogModal } from "./LogModal";
import { BackupModal } from "./BackupModal";
import { useGNovel } from "@/lib/storage";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/shelf/", label: "Shelf", icon: BookMarked },
  { href: "/diary/", label: "Diary", icon: CalendarDays },
  { href: "/lists/", label: "Lists", icon: Layers },
];

export function Navbar() {
  const pathname = usePathname() || "/";
  const { state, mounted } = useGNovel();
  const [logOpen, setLogOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);

  const trackedCount = mounted ? Object.keys(state.library).length : 0;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#121519]/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-black text-sm tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
                G
              </span>
              <span className="font-bold tracking-tight text-base text-foreground">
                GNOVEL
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href.replace(/\/$/, ""));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-white/10 text-foreground"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.label === "Shelf" && trackedCount > 0 && (
                      <span className="ml-0.5 rounded-full bg-primary/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                        {trackedCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setBackupOpen(true)}
              className="text-muted-foreground hover:text-foreground gap-1.5"
              title="Backup, Export & Sample Data"
            >
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Archive</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setLogOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold gap-1.5 px-3"
            >
              <Plus className="h-4 w-4" />
              <span>Log</span>
            </Button>
          </div>
        </div>

        {/* Mobile Nav Strip */}
        <nav className="flex md:hidden border-t border-white/5 px-2 py-1 justify-around">
          {NAV_LINKS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href.replace(/\/$/, ""));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
                  active ? "text-primary bg-white/5" : "text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <LogModal open={logOpen} onClose={() => setLogOpen(false)} />
      <BackupModal open={backupOpen} onClose={() => setBackupOpen(false)} />
    </>
  );
}
