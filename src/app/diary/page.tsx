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
      <div className="mx-auto max-w-[1080px] border-x border-[#2A2A2A] bg-[#121212] p-6">
        <div className="h-48 bg-[#1C1C1C] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1080px] border-x border-b border-[#2A2A2A] bg-[#121212]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E2E2E] bg-[#222222] px-4 py-2.5">
        <h1 className="text-base sm:text-lg font-bold text-white">
          Reading Diary &amp; Reviews
        </h1>
        <button
          type="button"
          onClick={() => setLogOpen(true)}
          className="inline-flex items-center gap-1 rounded-[2px] bg-[#2E51A2] hover:bg-[#3A62BE] px-2.5 py-1 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Log a Read
        </button>
      </div>

      <div className="p-3 sm:p-4">
        {grouped.length === 0 ? (
          <div className="border border-[#2C2C2C] bg-[#161616] p-10 text-center space-y-3">
            <CalendarDays className="h-8 w-8 text-[#8EB4FF] mx-auto" />
            <h2 className="text-base font-bold text-white">No Diary Entries Yet</h2>
            <p className="text-xs text-[#9B9B9B] max-w-md mx-auto">
              Log what you finished, track edition format, and record spoiler-tagged
              reviews.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={() => setLogOpen(true)}
                className="bg-[#2E51A2] hover:bg-[#3A62BE] text-white gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Log First Entry
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={loadStarterShelf}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#4ADE80]" />
                Load Sample Diary
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <section key={group.month} className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#2E2E2E] pb-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                    {group.month}
                  </h2>
                  <span className="font-mono text-[11px] text-[#9B9B9B]">
                    {group.entries.length}{" "}
                    {group.entries.length === 1 ? "entry" : "entries"}
                  </span>
                </div>

                <div className="divide-y divide-[#252525] border border-[#2C2C2C] bg-[#161616]">
                  {group.entries.map((entry) => {
                    const dayNum = entry.date.split("-")[2] || "—";
                    const meta = getStatusMeta(entry.status);
                    const hidden = entry.spoiler && !revealedSpoilers[entry.id];
                    const href = getNovelHref(entry.novel);

                    return (
                      <article key={entry.id} className="flex gap-3 p-3 text-xs">
                        <div className="hidden sm:flex flex-col items-center justify-center w-11 h-14 shrink-0 border border-[#2E2E2E] bg-[#121212]">
                          <span className="text-[9px] uppercase text-[#9B9B9B]">Day</span>
                          <span className="font-mono text-base font-bold text-white">
                            {dayNum}
                          </span>
                        </div>

                        <Link
                          href={href}
                          className="w-12 h-17 shrink-0 border border-[#333333] bg-[#222222] overflow-hidden"
                        >
                          {entry.novel.coverUrl && (
                            <img
                              src={entry.novel.coverUrl}
                              alt={entry.novel.title}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </Link>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link
                                href={href}
                                className="font-bold text-sm mal-link block truncate"
                              >
                                {entry.novel.title}
                              </Link>
                              <p className="text-[11px] text-[#9B9B9B] truncate">
                                {entry.novel.writers.join(", ")}
                                {entry.novel.year ? ` · ${entry.novel.year}` : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteDiaryLog(entry.id)}
                              className="p-1 text-[#9B9B9B] hover:text-[#FB7185] shrink-0"
                              aria-label="Delete diary entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="sm:hidden font-mono text-[#9B9B9B]">
                              {entry.date}
                            </span>
                            <StarRating value={entry.rating} readonly size="xs" showLabel />
                            {meta && (
                              <span
                                className={`border px-1.5 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                              >
                                {meta.label}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[#9B9B9B]">
                              <Layers className="h-3 w-3" />
                              {entry.edition}
                            </span>
                            {entry.reread && (
                              <span className="inline-flex items-center gap-1 text-[#8EB4FF]">
                                <RotateCcw className="h-3 w-3" />
                                Re-read
                              </span>
                            )}
                          </div>

                          {entry.review &&
                            (hidden ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedSpoilers((prev) => ({
                                    ...prev,
                                    [entry.id]: true,
                                  }))
                                }
                                className="inline-flex items-center gap-1 border border-[#E7B715]/40 bg-[#E7B715]/10 px-2.5 py-1 text-[11px] text-[#FACC15]"
                              >
                                <Eye className="h-3 w-3" />
                                Contains spoilers — click to reveal
                              </button>
                            ) : (
                              <p className="text-xs text-[#E5E5E5] leading-relaxed whitespace-pre-line pt-0.5">
                                {entry.review}
                              </p>
                            ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <LogModal open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}
