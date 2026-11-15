"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Eye,
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogModal } from "@/components/LogModal";
import { StarRating } from "@/components/StarRating";
import { getNovelHref } from "@/components/NovelCard";
import { getStatusMeta } from "@/lib/status";
import { useGNovel } from "@/lib/storage";
import type { DiaryEntry } from "@/lib/types";

function formatMonthHeading(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  if (!y || !m) return "Undated";
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function DiaryPage() {
  const { state, mounted, deleteDiaryLog, loadStarterShelf } = useGNovel();
  const [logOpen, setLogOpen] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const groups: { month: string; entries: DiaryEntry[] }[] = [];
    const map = new Map<string, DiaryEntry[]>();
    for (const entry of state.diary) {
      const month = formatMonthHeading(entry.date);
      if (!map.has(month)) {
        const arr: DiaryEntry[] = [];
        map.set(month, arr);
        groups.push({ month, entries: arr });
      }
      map.get(month)!.push(entry);
    }
    return groups;
  }, [state.diary]);

  if (!mounted) {
    return (
      <div className="container mx-auto max-w-screen-lg px-4 py-12">
        <div className="h-48 rounded-2xl bg-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-screen-lg px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">Reading Diary</h1>
          <p className="text-sm text-muted-foreground mt-1">
            A chronological log of every issue run, trade, omnibus, and re-read.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setLogOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Log a Read
        </Button>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-card/40 p-12 text-center space-y-4">
          <CalendarDays className="h-10 w-10 text-primary/80 mx-auto" />
          <div className="space-y-1">
            <h2 className="font-serif text-2xl">No diary entries yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Log what you finished today, record which edition you read, and jot down
              reviews or favorite moments.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button type="button" onClick={() => setLogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Log First Entry
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={loadStarterShelf}
              className="gap-2 border border-white/10"
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Load Sample Diary
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map((group) => (
            <section key={group.month} className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.month}
                </h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {group.entries.length}{" "}
                  {group.entries.length === 1 ? "entry" : "entries"}
                </span>
              </div>

              <div className="space-y-3">
                {group.entries.map((entry) => {
                  const dayNum = entry.date.split("-")[2] || "—";
                  const meta = getStatusMeta(entry.status);
                  const hidden = entry.spoiler && !revealedSpoilers[entry.id];
                  const href = getNovelHref(entry.novel);

                  return (
                    <article
                      key={entry.id}
                      className="flex gap-4 rounded-2xl border border-white/10 bg-card p-4 transition-colors hover:border-white/20"
                    >
                      {/* Calendar Day Badge */}
                      <div className="hidden sm:flex flex-col items-center justify-center w-12 h-14 shrink-0 rounded-xl bg-secondary/60 border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Day
                        </span>
                        <span className="font-mono text-lg font-bold text-foreground">
                          {dayNum}
                        </span>
                      </div>

                      {/* Cover Thumbnail */}
                      <Link
                        href={href}
                        className="w-16 h-24 shrink-0 rounded-lg overflow-hidden bg-secondary border border-white/10"
                      >
                        {entry.novel.coverUrl && (
                          <img
                            src={entry.novel.coverUrl}
                            alt={entry.novel.title}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </Link>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={href}
                              className="font-serif text-xl leading-tight text-foreground hover:text-primary transition-colors block truncate"
                            >
                              {entry.novel.title}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate">
                              {entry.novel.writers.join(", ")}
                              {entry.novel.year ? ` · ${entry.novel.year}` : ""}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteDiaryLog(entry.id)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-rose-400 transition-colors shrink-0"
                            aria-label="Delete diary entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="sm:hidden font-mono text-muted-foreground">
                            {entry.date}
                          </span>
                          {entry.rating > 0 && (
                            <StarRating value={entry.rating} readonly size="xs" showLabel />
                          )}
                          {meta && (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                            >
                              {meta.label}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/70 border border-white/5 px-2 py-0.5 text-[11px] text-muted-foreground">
                            <Layers className="h-3 w-3" />
                            {entry.edition}
                          </span>
                          {entry.reread && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[11px] text-sky-300">
                              <RotateCcw className="h-3 w-3" />
                              Re-read
                            </span>
                          )}
                        </div>

                        {entry.review && (
                          hidden ? (
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedSpoilers((prev) => ({
                                  ...prev,
                                  [entry.id]: true,
                                }))
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Contains spoilers — click to reveal
                            </button>
                          ) : (
                            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line pt-1">
                              {entry.review}
                            </p>
                          )
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <LogModal open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}
