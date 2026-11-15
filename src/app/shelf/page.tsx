"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookMarked,
  ExternalLink,
  Heart,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NovelCard, getNovelHref } from "@/components/NovelCard";
import { LogModal } from "@/components/LogModal";
import { CURATED_NOVELS, getCuratedNovelById } from "@/lib/catalog";
import { MAL_SCORE_LABELS, STATUS_OPTIONS, getStatusMeta } from "@/lib/status";
import { useGNovel } from "@/lib/storage";
import type { GraphicNovel, LibraryEntry, ReadingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type ShelfFilter = "all" | "favorites" | Exclude<ReadingStatus, "none">;
type ShelfSort = "updated" | "rating" | "year" | "title";

const SCORE_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function ShelfPage() {
  const {
    state,
    mounted,
    setFavoriteSlot,
    setRating,
    setProgress,
    loadStarterShelf,
  } = useGNovel();

  const [filter, setFilter] = useState<ShelfFilter>("all");
  const [sortBy, setSortBy] = useState<ShelfSort>("updated");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);
  const [logNovel, setLogNovel] = useState<GraphicNovel | null>(null);

  const entries = useMemo(() => Object.values(state.library), [state.library]);

  const stats = useMemo(() => {
    const completed = entries.filter((e) => e.status === "completed").length;
    const reading = entries.filter((e) => e.status === "reading").length;
    const plan = entries.filter((e) => e.status === "plan").length;
    const rated = entries.filter((e) => e.rating > 0);
    const avgRating =
      rated.length > 0
        ? rated.reduce((sum, e) => sum + e.rating, 0) / rated.length
        : 0;
    const issuesRead = entries.reduce((sum, e) => sum + (e.issuesRead || 0), 0);

    const buckets = SCORE_STEPS.map((step) => ({
      step,
      count: rated.filter((e) => e.rating === step).length,
    }));
    const maxBucket = Math.max(1, ...buckets.map((b) => b.count));

    return {
      total: entries.length,
      completed,
      reading,
      plan,
      avgRating,
      issuesRead,
      buckets,
      maxBucket,
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const list = entries.filter((e) => {
      if (filter === "all") return true;
      if (filter === "favorites") return e.liked;
      return e.status === filter;
    });

    const copy = [...list];
    if (sortBy === "updated") {
      copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } else if (sortBy === "rating") {
      copy.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "year") {
      copy.sort((a, b) => (b.novel.year || 0) - (a.novel.year || 0));
    } else if (sortBy === "title") {
      copy.sort((a, b) => a.novel.title.localeCompare(b.novel.title));
    }
    return copy;
  }, [entries, filter, sortBy]);

  const favoriteChoices = useMemo(() => {
    const fromLibrary = entries.map((e) => e.novel);
    const seen = new Set(fromLibrary.map((n) => n.id));
    return [...fromLibrary, ...CURATED_NOVELS.filter((n) => !seen.has(n.id))];
  }, [entries]);

  const resolveNovel = (id: string): GraphicNovel | undefined =>
    state.library[id]?.novel || getCuratedNovelById(id);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-[1080px] border-x border-[#2A2A2A] bg-[#121212] p-6">
        <div className="h-48 bg-[#1C1C1C] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1080px] border-x border-b border-[#2A2A2A] bg-[#121212]">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E2E2E] bg-[#222222] px-4 py-2.5">
        <h1 className="text-base sm:text-lg font-bold text-white">
          My Graphic Novel List &amp; Stats
        </h1>
        <span className="font-mono text-xs text-[#9B9B9B]">
          Mean Score:{" "}
          <strong className="text-white">
            {stats.avgRating > 0 ? stats.avgRating.toFixed(2) : "—"}
          </strong>
        </span>
      </div>

      <div className="p-3 sm:p-4 space-y-6">
        {/* Top Profile Strip: Favorites + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Favorites */}
          <div className="lg:col-span-5 border border-[#2C2C2C] bg-[#161616] p-3 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#252525] pb-1.5">
              <h2 className="text-xs font-bold text-white">Favorite Graphic Novels</h2>
              <Heart className="h-3.5 w-3.5 text-[#FB7185] fill-[#FB7185]" />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((slot) => {
                const favId = state.favorites[slot];
                const favNovel = favId ? resolveNovel(favId) : undefined;
                return (
                  <div key={slot} className="relative group">
                    <button
                      type="button"
                      onClick={() => setPickingSlot(slot)}
                      className="aspect-[2/3] w-full overflow-hidden border border-[#333333] bg-[#1C1C1C] hover:border-[#4C74D6] flex items-center justify-center relative"
                    >
                      {favNovel ? (
                        <>
                          <img
                            src={favNovel.coverUrl}
                            alt={favNovel.title}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-semibold text-white">
                            Swap
                          </div>
                        </>
                      ) : (
                        <Plus className="h-4 w-4 text-[#666666]" />
                      )}
                    </button>
                    {favNovel && (
                      <button
                        type="button"
                        onClick={() => setFavoriteSlot(slot, null)}
                        title="Remove favorite"
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#222222] border border-[#444444] text-[#CCCCCC] hover:text-white hidden group-hover:flex items-center justify-center"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats & Score Distribution (1-10) */}
          <div className="lg:col-span-7 border border-[#2C2C2C] bg-[#161616] p-3 space-y-3">
            <h2 className="border-b border-[#252525] pb-1.5 text-xs font-bold text-white">
              Graphic Novel Stats
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="border border-[#262626] bg-[#121212] p-2">
                <span className="text-[10px] text-[#9B9B9B] block">Total Entries</span>
                <span className="font-mono text-base font-bold text-white">
                  {stats.total}
                </span>
              </div>
              <div className="border border-[#262626] bg-[#121212] p-2">
                <span className="text-[10px] text-[#9B9B9B] block">Reading</span>
                <span className="font-mono text-base font-bold text-[#4ADE80]">
                  {stats.reading}
                </span>
              </div>
              <div className="border border-[#262626] bg-[#121212] p-2">
                <span className="text-[10px] text-[#9B9B9B] block">Completed</span>
                <span className="font-mono text-base font-bold text-[#8EB4FF]">
                  {stats.completed}
                </span>
              </div>
              <div className="border border-[#262626] bg-[#121212] p-2">
                <span className="text-[10px] text-[#9B9B9B] block">Plan to Read</span>
                <span className="font-mono text-base font-bold text-[#CCCCCC]">
                  {stats.plan}
                </span>
              </div>
              <div className="border border-[#262626] bg-[#121212] p-2 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-[#9B9B9B] block">Issues Read</span>
                <span className="font-mono text-base font-bold text-[#FACC15]">
                  {stats.issuesRead}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-[#9B9B9B]">
                <span>Score Distribution (1–10)</span>
                <span className="font-mono">1 → 10</span>
              </div>
              <div className="flex items-end gap-1 h-14 pt-1">
                {stats.buckets.map((b) => {
                  const pct =
                    b.count > 0
                      ? Math.max(18, Math.round((b.count / stats.maxBucket) * 100))
                      : 8;
                  return (
                    <div
                      key={b.step}
                      className="flex-1 flex flex-col items-center justify-end h-full gap-1"
                      title={`Score ${b.step}: ${b.count}`}
                    >
                      <div
                        className={cn(
                          "w-full transition-all",
                          b.count > 0 ? "bg-[#2E51A2] hover:bg-[#4C74D6]" : "bg-[#242424]"
                        )}
                        style={{ height: `${pct}%` }}
                      />
                      <span className="font-mono text-[9px] text-[#777777]">{b.step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* MAL Status Filter Tabs & Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2A2A2A] pb-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "shrink-0 px-3 py-1 rounded-[2px] border",
                filter === "all"
                  ? "bg-[#2E51A2] border-[#4C74D6] text-white font-semibold"
                  : "bg-[#1A1A1A] border-[#2C2C2C] text-[#9B9B9B] hover:text-white"
              )}
            >
              All ({entries.length})
            </button>

            {STATUS_OPTIONS.map((opt) => {
              const count = entries.filter((e) => e.status === opt.value).length;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilter(opt.value)}
                  className={cn(
                    "shrink-0 px-3 py-1 rounded-[2px] border",
                    filter === opt.value
                      ? opt.badgeClass + " font-semibold"
                      : "bg-[#1A1A1A] border-[#2C2C2C] text-[#9B9B9B] hover:text-white"
                  )}
                >
                  {opt.label} ({count})
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setFilter("favorites")}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-[2px] border",
                filter === "favorites"
                  ? "bg-[#FB7185]/20 border-[#FB7185]/40 text-[#FB7185] font-semibold"
                  : "bg-[#1A1A1A] border-[#2C2C2C] text-[#9B9B9B] hover:text-white"
              )}
            >
              <Heart className="h-3 w-3" />
              Favorites ({entries.filter((e) => e.liked).length})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ShelfSort)}
              aria-label="Sort shelf"
              className="h-7 rounded-[2px] border border-[#333333] bg-[#1A1A1A] px-2 text-xs text-white"
            >
              <option value="updated">Sort: Recently Updated</option>
              <option value="rating">Sort: Your Score</option>
              <option value="year">Sort: Release Year</option>
              <option value="title">Sort: Title A–Z</option>
            </select>

            <div className="inline-flex border border-[#333333] bg-[#1A1A1A] p-0.5 rounded-[2px]">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1 rounded-[1px]",
                  viewMode === "table" ? "bg-[#2E51A2] text-white" : "text-[#9B9B9B]"
                )}
                aria-label="MAL Table View"
              >
                <ListIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1 rounded-[1px]",
                  viewMode === "grid" ? "bg-[#2E51A2] text-white" : "text-[#9B9B9B]"
                )}
                aria-label="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* List / Empty State */}
        {entries.length === 0 ? (
          <div className="border border-[#2C2C2C] bg-[#161616] p-10 text-center space-y-3">
            <BookMarked className="h-8 w-8 text-[#8EB4FF] mx-auto" />
            <h2 className="text-base font-bold text-white">Your Shelf Is Empty</h2>
            <p className="text-xs text-[#9B9B9B] max-w-md mx-auto">
              Add graphic novels from the catalog or load a sample shelf to preview MAL
              stats and list tracking.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <Link href="/">
                <Button size="sm" className="bg-[#2E51A2] hover:bg-[#3A62BE] text-white">
                  Browse Graphic Novels
                </Button>
              </Link>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={loadStarterShelf}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#4ADE80]" />
                Load Sample Shelf
              </Button>
            </div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="border border-[#2C2C2C] bg-[#161616] p-8 text-center text-xs text-[#9B9B9B]">
            No entries in this status tab yet.
          </div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto border border-[#2C2C2C]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#2E51A2] text-white text-[11px] font-bold">
                  <th className="w-1.5 p-0"></th>
                  <th className="py-2 px-2 w-10 text-center">#</th>
                  <th className="py-2 px-2 w-14">Image</th>
                  <th className="py-2 px-3">Title</th>
                  <th className="py-2 px-3 w-36 text-center">Score</th>
                  <th className="py-2 px-3 w-24 text-center hidden sm:table-cell">Type</th>
                  <th className="py-2 px-3 w-28 text-center">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525] bg-[#141414]">
                {filteredEntries.map((entry: LibraryEntry, idx) => {
                  const meta = getStatusMeta(entry.status);
                  const total = entry.novel.issues || 0;
                  return (
                    <tr
                      key={entry.novelId}
                      className="hover:bg-[#1B1B1B] transition-colors"
                    >
                      <td className={cn("w-1.5 p-0", meta?.stripColor || "bg-[#333333]")} />
                      <td className="py-2 px-2 text-center font-mono text-[#9B9B9B]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2">
                        <Link
                          href={getNovelHref(entry.novel)}
                          className="block w-10 h-14 border border-[#333333] bg-[#222222] overflow-hidden"
                        >
                          {entry.novel.coverUrl && (
                            <img
                              src={entry.novel.coverUrl}
                              alt={entry.novel.title}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </Link>
                      </td>
                      <td className="py-2 px-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Link
                              href={getNovelHref(entry.novel)}
                              className="font-bold mal-link"
                            >
                              {entry.novel.title}
                            </Link>
                            {entry.liked && (
                              <Heart className="h-3 w-3 fill-[#FB7185] text-[#FB7185] shrink-0" />
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#9B9B9B]">
                            <span>{entry.novel.writers[0]}</span>
                            <button
                              type="button"
                              onClick={() => setLogNovel(entry.novel)}
                              className="mal-link"
                            >
                              Edit / Log
                            </button>
                            {entry.customUrl && (
                              <a
                                href={entry.customUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 text-[#4ADE80] hover:underline"
                              >
                                Read <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-2 px-3 text-center">
                        <select
                          value={entry.rating}
                          onChange={(e) =>
                            setRating(entry.novel, Number(e.target.value))
                          }
                          aria-label={`Score for ${entry.novel.title}`}
                          className="h-7 w-full rounded-[2px] border border-[#333333] bg-[#1A1A1A] px-1.5 text-[11px] text-white"
                        >
                          <option value={0}>—</option>
                          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {MAL_SCORE_LABELS[n]}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2 px-3 text-center hidden sm:table-cell text-[#CCCCCC]">
                        {entry.novel.format}
                      </td>

                      <td className="py-2 px-3 text-center font-mono">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="text-white">
                            {entry.issuesRead} / {total || "?"}
                          </span>
                          <button
                            type="button"
                            title="Increment +1"
                            onClick={() =>
                              setProgress(
                                entry.novel,
                                total
                                  ? Math.min(total, entry.issuesRead + 1)
                                  : entry.issuesRead + 1
                              )
                            }
                            className="flex h-5 w-5 items-center justify-center rounded-[2px] bg-[#222222] border border-[#3A3A3A] text-[#8EB4FF] hover:bg-[#2E51A2] hover:text-white"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {filteredEntries.map((entry) => (
              <NovelCard
                key={entry.novelId}
                novel={entry.novel}
                onLogClick={(n) => setLogNovel(n)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Favorite Picker Modal */}
      {pickingSlot !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickingSlot(null);
          }}
        >
          <div className="w-full max-w-lg border border-[#333333] bg-[#181818] p-4 space-y-3 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2C2C2C] pb-2">
              <h3 className="font-bold text-xs text-white">
                Select Favorite #{pickingSlot + 1}
              </h3>
              <button
                type="button"
                onClick={() => setPickingSlot(null)}
                className="text-[#9B9B9B] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 overflow-y-auto pr-1">
              {favoriteChoices.map((novel) => (
                <button
                  key={novel.id}
                  type="button"
                  onClick={() => {
                    setFavoriteSlot(pickingSlot, novel.id);
                    setPickingSlot(null);
                  }}
                  className="text-left group space-y-1"
                >
                  <div className="aspect-[2/3] overflow-hidden border border-[#333333] bg-[#222222] group-hover:border-[#4C74D6]">
                    {novel.coverUrl && (
                      <img
                        src={novel.coverUrl}
                        alt={novel.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <p className="text-[11px] truncate text-[#CCCCCC] group-hover:text-white">
                    {novel.title}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <LogModal
        open={Boolean(logNovel)}
        onClose={() => setLogNovel(null)}
        initialNovel={logNovel}
      />
    </div>
  );
}
