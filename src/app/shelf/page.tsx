"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookMarked,
  Compass,
  Heart,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NovelCard, getNovelHref } from "@/components/NovelCard";
import { StarRating } from "@/components/StarRating";
import { LogModal } from "@/components/LogModal";
import { CURATED_NOVELS, getCuratedNovelById } from "@/lib/catalog";
import { STATUS_OPTIONS, getStatusMeta } from "@/lib/status";
import { useGNovel } from "@/lib/storage";
import type { GraphicNovel, LibraryEntry, ReadingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type ShelfFilter = "all" | "favorites" | Exclude<ReadingStatus, "none">;
type ShelfSort = "updated" | "rating" | "year" | "title";

const RATING_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export default function ShelfPage() {
  const { state, mounted, setFavoriteSlot, loadStarterShelf } = useGNovel();

  const [filter, setFilter] = useState<ShelfFilter>("all");
  const [sortBy, setSortBy] = useState<ShelfSort>("updated");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
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

    const buckets = RATING_STEPS.map((step) => ({
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
      <div className="container mx-auto max-w-screen-2xl px-4 py-12">
        <div className="h-48 rounded-2xl bg-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-screen-2xl px-4 py-8 space-y-10">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Four Favorites */}
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl tracking-tight">Four Favorites</h1>
              <p className="text-xs text-muted-foreground">
                Your signature shelf — click any frame to swap.
              </p>
            </div>
            <Heart className="h-4 w-4 text-rose-400 fill-rose-400" />
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {[0, 1, 2, 3].map((slot) => {
              const favId = state.favorites[slot];
              const favNovel = favId ? resolveNovel(favId) : undefined;
              return (
                <div key={slot} className="relative group">
                  <button
                    type="button"
                    onClick={() => setPickingSlot(slot)}
                    className="aspect-[2/3] w-full overflow-hidden rounded-xl border border-dashed border-white/15 bg-secondary/40 hover:border-primary/60 transition-all flex items-center justify-center relative"
                  >
                    {favNovel ? (
                      <>
                        <img
                          src={favNovel.coverUrl}
                          alt={favNovel.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[11px] font-medium text-white px-1 text-center">
                          Swap
                        </div>
                      </>
                    ) : (
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  {favNovel && (
                    <button
                      type="button"
                      onClick={() => setFavoriteSlot(slot, null)}
                      title="Remove favorite"
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-card border border-white/20 text-muted-foreground hover:text-foreground hidden group-hover:flex items-center justify-center shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Reader Stats + Rating Distribution */}
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-card p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-xl bg-secondary/40 border border-white/5 p-3">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground block">
                Tracked
              </span>
              <span className="text-2xl font-bold font-mono text-foreground">
                {stats.total}
              </span>
            </div>
            <div className="rounded-xl bg-secondary/40 border border-white/5 p-3">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground block">
                Completed
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {stats.completed}
              </span>
            </div>
            <div className="rounded-xl bg-secondary/40 border border-white/5 p-3">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground block">
                Reading
              </span>
              <span className="text-2xl font-bold font-mono text-sky-400">
                {stats.reading}
              </span>
            </div>
            <div className="rounded-xl bg-secondary/40 border border-white/5 p-3">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground block">
                Issues Read
              </span>
              <span className="text-2xl font-bold font-mono text-foreground">
                {stats.issuesRead}
              </span>
            </div>
            <div className="rounded-xl bg-secondary/40 border border-white/5 p-3 col-span-2 sm:col-span-1">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground block">
                Mean Rating
              </span>
              <span className="text-2xl font-bold font-mono text-primary">
                {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
              </span>
            </div>
          </div>

          {/* Letterboxd-style Half-Star Distribution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="uppercase tracking-wider font-semibold text-[11px]">
                Rating Distribution
              </span>
              <span className="font-mono">0.5 ★ — 5.0 ★</span>
            </div>
            <div className="flex items-end gap-1.5 h-16 pt-2">
              {stats.buckets.map((b) => {
                const heightPct =
                  b.count > 0 ? Math.max(18, Math.round((b.count / stats.maxBucket) * 100)) : 8;
                return (
                  <div
                    key={b.step}
                    className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                    title={`${b.step.toFixed(1)} ★: ${b.count}`}
                  >
                    <div
                      className={cn(
                        "w-full rounded-t-sm transition-all",
                        b.count > 0 ? "bg-primary/85 hover:bg-primary" : "bg-white/10"
                      )}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Shelf Controls */}
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                filter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/50 text-muted-foreground border-white/5 hover:text-foreground"
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
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                    filter === opt.value
                      ? opt.badgeClass
                      : "bg-secondary/50 text-muted-foreground border-white/5 hover:text-foreground"
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
                "shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                filter === "favorites"
                  ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                  : "bg-secondary/50 text-muted-foreground border-white/5 hover:text-foreground"
              )}
            >
              <Heart className="h-3 w-3" />
              Likes ({entries.filter((e) => e.liked).length})
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ShelfSort)}
              aria-label="Sort shelf"
              className="h-8 rounded-lg border border-white/10 bg-secondary/50 px-2.5 text-xs font-medium text-foreground focus:outline-none"
            >
              <option value="updated" className="bg-card">Recently Updated</option>
              <option value="rating" className="bg-card">Your Rating</option>
              <option value="year" className="bg-card">Release Year</option>
              <option value="title" className="bg-card">Title A–Z</option>
            </select>

            <div className="inline-flex rounded-lg border border-white/10 bg-secondary/50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-md p-1.5",
                  viewMode === "grid" ? "bg-card text-foreground" : "text-muted-foreground"
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-md p-1.5",
                  viewMode === "list" ? "bg-card text-foreground" : "text-muted-foreground"
                )}
                aria-label="List view"
              >
                <ListIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Empty State vs Items */}
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-card/40 p-12 text-center space-y-4">
            <BookMarked className="h-10 w-10 text-primary/80 mx-auto" />
            <div className="space-y-1">
              <h2 className="font-serif text-2xl">Your shelf is waiting</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Discover graphic novels and hover any cover to mark it Read, Backlog, or
                Liked—or load a sample shelf to explore the stats right away.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/">
                <Button className="gap-2">
                  <Compass className="h-4 w-4" />
                  Browse Discover
                </Button>
              </Link>
              <Button
                type="button"
                variant="secondary"
                onClick={loadStarterShelf}
                className="gap-2 border border-white/10"
              >
                <Sparkles className="h-4 w-4 text-emerald-400" />
                Load Sample Shelf
              </Button>
            </div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card/40 p-10 text-center text-sm text-muted-foreground">
            No graphic novels in this category yet.
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-7">
            {filteredEntries.map((entry) => (
              <NovelCard
                key={entry.novelId}
                novel={entry.novel}
                onLogClick={(n) => setLogNovel(n)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-card overflow-hidden divide-y divide-white/5">
            {filteredEntries.map((entry: LibraryEntry) => {
              const meta = getStatusMeta(entry.status);
              return (
                <div
                  key={entry.novelId}
                  className="flex items-center gap-4 p-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <Link
                    href={getNovelHref(entry.novel)}
                    className="h-16 w-11 shrink-0 rounded-md overflow-hidden bg-secondary border border-white/10"
                  >
                    {entry.novel.coverUrl && (
                      <img
                        src={entry.novel.coverUrl}
                        alt={entry.novel.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={getNovelHref(entry.novel)}
                      className="font-medium text-sm text-foreground hover:text-primary truncate block"
                    >
                      {entry.novel.title}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.novel.writers.join(", ")}
                      {entry.novel.year ? ` · ${entry.novel.year}` : ""}
                    </p>
                  </div>

                  {entry.novel.issues && (
                    <span className="hidden sm:inline-block font-mono text-xs text-muted-foreground">
                      {entry.issuesRead}/{entry.novel.issues} iss.
                    </span>
                  )}

                  {meta && (
                    <span
                      className={`hidden md:inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}
                    >
                      {meta.label}
                    </span>
                  )}

                  <div className="w-24 flex justify-end">
                    {entry.rating > 0 ? (
                      <StarRating value={entry.rating} readonly size="xs" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Favorite Slot Picker Modal */}
      {pickingSlot !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickingSlot(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-card p-5 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Choose Favorite #{pickingSlot + 1}
              </h3>
              <button
                type="button"
                onClick={() => setPickingSlot(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto pr-1">
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
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-secondary border border-white/10 group-hover:border-primary">
                    {novel.coverUrl && (
                      <img
                        src={novel.coverUrl}
                        alt={novel.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <p className="text-[11px] truncate text-muted-foreground group-hover:text-foreground">
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
