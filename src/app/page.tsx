"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Globe,
  LayoutGrid,
  List as ListIcon,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NovelCard, getNovelHref } from "@/components/NovelCard";
import { LogModal } from "@/components/LogModal";
import {
  ALL_GENRES,
  CURATED_NOVELS,
  EDITORIAL_COLLECTIONS,
  getCuratedNovelById,
} from "@/lib/catalog";
import { cacheNovelSnapshot, searchOpenLibrary } from "@/lib/openlibrary";
import { STATUS_OPTIONS, getStatusMeta } from "@/lib/status";
import { useGNovel } from "@/lib/storage";
import type { GraphicNovel, NovelFormat, ReadingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortOption = "ranked" | "popularity" | "newest" | "title";
const FORMAT_FILTERS: ("All" | NovelFormat)[] = [
  "All",
  "Graphic Novel",
  "Series",
  "Manga",
  "Omnibus",
];

function HomePageClient() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  const { state, mounted, getEntry, setStatus, loadStarterShelf } = useGNovel();

  const [queryOverride, setQueryOverride] = useState<string | null>(null);
  const query = queryOverride !== null ? queryOverride : urlQuery;

  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [selectedFormat, setSelectedFormat] = useState<"All" | NovelFormat>("All");
  const [sortBy, setSortBy] = useState<SortOption>("ranked");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [remoteResults, setRemoteResults] = useState<GraphicNovel[]>([]);
  const [searchingRemote, setSearchingRemote] = useState(false);
  const [remoteError, setRemoteError] = useState(false);
  const [comicsOnlySearch, setComicsOnlySearch] = useState(true);

  const [logNovel, setLogNovel] = useState<GraphicNovel | null>(null);

  const handleQueryChange = (next: string) => {
    setQueryOverride(next);
    if (next.trim().length < 2) {
      setRemoteResults([]);
      setSearchingRemote(false);
      setRemoteError(false);
    }
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchingRemote(true);
      setRemoteError(false);
      try {
        const docs = await searchOpenLibrary(trimmed, comicsOnlySearch, controller.signal);
        setRemoteResults(docs);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setRemoteError(true);
        }
      } finally {
        setSearchingRemote(false);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, comicsOnlySearch]);

  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = CURATED_NOVELS.filter((novel) => {
      if (selectedGenre !== "All" && !novel.genres.includes(selectedGenre)) return false;
      if (selectedFormat !== "All" && novel.format !== selectedFormat) return false;
      if (!q) return true;
      return (
        novel.title.toLowerCase().includes(q) ||
        novel.writers.some((w) => w.toLowerCase().includes(q)) ||
        novel.artists.some((a) => a.toLowerCase().includes(q)) ||
        novel.publisher.toLowerCase().includes(q) ||
        novel.genres.some((g) => g.toLowerCase().includes(q))
      );
    });

    const copy = [...filtered];
    if (sortBy === "ranked") {
      copy.sort((a, b) => b.communityScore - a.communityScore);
    } else if (sortBy === "popularity") {
      copy.sort((a, b) => (b.membersCount || 0) - (a.membersCount || 0));
    } else if (sortBy === "newest") {
      copy.sort((a, b) => b.year - a.year);
    } else if (sortBy === "title") {
      copy.sort((a, b) => a.title.localeCompare(b.title));
    }
    return copy;
  }, [query, selectedGenre, selectedFormat, sortBy]);

  const deduplicatedRemote = useMemo(() => {
    const curatedOlKeys = new Set(CURATED_NOVELS.map((n) => n.olKey).filter(Boolean));
    const curatedTitles = new Set(CURATED_NOVELS.map((n) => n.title.toLowerCase()));
    return remoteResults.filter(
      (r) =>
        (!r.olKey || !curatedOlKeys.has(r.olKey)) &&
        !curatedTitles.has(r.title.toLowerCase())
    );
  }, [remoteResults]);

  const trackedCount = mounted ? Object.keys(state.library).length : 0;

  return (
    <div className="mx-auto max-w-[1080px] border-x border-b border-[#2A2A2A] bg-[#121212]">
      {/* MAL Title Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E2E2E] bg-[#222222] px-4 py-2.5">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white">
            {query ? `Search Results for "${query}"` : "Top Graphic Novels & Comics"}
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {mounted && trackedCount === 0 ? (
            <button
              type="button"
              onClick={loadStarterShelf}
              className="inline-flex items-center gap-1 text-[#4ADE80] hover:underline font-medium"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Load Sample Shelf
            </button>
          ) : mounted && trackedCount > 0 ? (
            <Link href="/shelf/" className="mal-link">
              My Shelf ({trackedCount})
            </Link>
          ) : null}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="border-b border-[#2A2A2A] bg-[#161616] p-3 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-md">
            <Search className="h-3.5 w-3.5 text-[#9B9B9B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Filter catalog or search Open Library..."
              className="h-8 pl-8 pr-8 rounded-[2px] border-[#333333] bg-[#101010] text-xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => handleQueryChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9B9B9B] hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as "All" | NovelFormat)}
              aria-label="Filter format"
              className="h-8 rounded-[2px] border border-[#333333] bg-[#101010] px-2 text-xs text-white focus:outline-none focus:border-[#4C74D6]"
            >
              {FORMAT_FILTERS.map((f) => (
                <option key={f} value={f}>
                  Format: {f}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort catalog"
              className="h-8 rounded-[2px] border border-[#333333] bg-[#101010] px-2 text-xs text-white focus:outline-none focus:border-[#4C74D6]"
            >
              <option value="ranked">Sort: Top Ranked</option>
              <option value="popularity">Sort: Most Popular</option>
              <option value="newest">Sort: Newest</option>
              <option value="title">Sort: Title A–Z</option>
            </select>

            <div className="inline-flex border border-[#333333] bg-[#101010] p-0.5 rounded-[2px]">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "px-2 py-1 text-xs inline-flex items-center gap-1 rounded-[1px]",
                  viewMode === "table"
                    ? "bg-[#2E51A2] text-white font-semibold"
                    : "text-[#9B9B9B] hover:text-white"
                )}
              >
                <ListIcon className="h-3.5 w-3.5" />
                Ranked
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-2 py-1 text-xs inline-flex items-center gap-1 rounded-[1px]",
                  viewMode === "grid"
                    ? "bg-[#2E51A2] text-white font-semibold"
                    : "text-[#9B9B9B] hover:text-white"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Covers
              </button>
            </div>
          </div>
        </div>

        {/* Genre Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px]">
          {["All", ...ALL_GENRES].map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => setSelectedGenre(genre)}
              className={cn(
                "shrink-0 px-2.5 py-1 rounded-[2px] border transition-colors",
                selectedGenre === genre
                  ? "bg-[#2E51A2] border-[#4C74D6] text-white font-semibold"
                  : "bg-[#121212] border-[#2C2C2C] text-[#9B9B9B] hover:text-white"
              )}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Main Catalog List */}
      <div className="p-3 sm:p-4 space-y-6">
        {localMatches.length === 0 ? (
          <div className="border border-[#2C2C2C] bg-[#161616] p-8 text-center text-xs text-[#9B9B9B] space-y-2">
            <p>No curated titles matched those filters.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedGenre("All");
                setSelectedFormat("All");
              }}
              className="mal-link"
            >
              Reset filters
            </button>
          </div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto border border-[#2C2C2C]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#2E51A2] text-white text-[11px] font-bold">
                  <th className="py-2 px-3 w-14 text-center">Rank</th>
                  <th className="py-2 px-3">Title</th>
                  <th className="py-2 px-3 w-24 text-center">Score</th>
                  <th className="py-2 px-3 w-24 text-center hidden sm:table-cell">
                    Your Score
                  </th>
                  <th className="py-2 px-3 w-36 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525] bg-[#141414]">
                {localMatches.map((novel, idx) => {
                  const entry = getEntry(novel.id);
                  const statusMeta = entry?.status ? getStatusMeta(entry.status) : undefined;
                  const href = getNovelHref(novel);

                  return (
                    <tr
                      key={novel.id}
                      className="hover:bg-[#1B1B1B] transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-base font-bold text-[#9B9B9B]">
                        {novel.ranked || idx + 1}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex gap-3">
                          <Link
                            href={href}
                            onClick={() => cacheNovelSnapshot(novel)}
                            className="w-12 h-17 shrink-0 border border-[#333333] bg-[#222222] overflow-hidden"
                          >
                            {novel.coverUrl && (
                              <img
                                src={novel.coverUrl}
                                alt={novel.title}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            )}
                          </Link>
                          <div className="min-w-0 space-y-0.5">
                            <Link
                              href={href}
                              onClick={() => cacheNovelSnapshot(novel)}
                              className="font-bold text-sm mal-link block"
                            >
                              {novel.title}
                            </Link>
                            <p className="text-[11px] text-[#9B9B9B]">
                              {novel.format}
                              {novel.issues ? ` (${novel.issues} issues)` : ""} ·{" "}
                              {novel.writers.join(", ")}
                            </p>
                            <p className="text-[11px] text-[#7F7F7F]">
                              {novel.publisher} · {novel.year} ·{" "}
                              {(novel.membersCount || 0).toLocaleString()} members
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-[#FACC15]">
                          <Star className="h-3.5 w-3.5 fill-[#FACC15] text-[#FACC15]" />
                          {novel.communityScore.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center hidden sm:table-cell font-mono">
                        {entry?.rating ? (
                          <span className="text-[#8EB4FF] font-bold">{entry.rating}</span>
                        ) : (
                          <span className="text-[#666666]">N/A</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <select
                            value={entry?.status || "none"}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "none") {
                                if (entry?.status && entry.status !== "none") {
                                  setStatus(novel, entry.status);
                                }
                              } else {
                                const target = val as Exclude<ReadingStatus, "none">;
                                if (entry?.status !== target) setStatus(novel, target);
                              }
                            }}
                            aria-label={`Set status for ${novel.title}`}
                            className={cn(
                              "h-7 w-28 rounded-[2px] border px-1.5 text-[11px] font-semibold focus:outline-none",
                              statusMeta
                                ? statusMeta.badgeClass
                                : "border-[#3A3A3A] bg-[#222222] text-[#E5E5E5]"
                            )}
                          >
                            <option value="none" className="bg-[#181818] text-white">
                              + Add to List
                            </option>
                            {STATUS_OPTIONS.map((opt) => (
                              <option
                                key={opt.value}
                                value={opt.value}
                                className="bg-[#181818] text-white"
                              >
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setLogNovel(novel)}
                            className="text-[10px] mal-link"
                          >
                            Log / Review
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
            {localMatches.map((novel) => (
              <NovelCard
                key={novel.id}
                novel={novel}
                rank={novel.ranked}
                onLogClick={(n) => setLogNovel(n)}
              />
            ))}
          </div>
        )}

        {/* Live Open Library Results */}
        {query.trim().length >= 2 && (
          <section className="space-y-3 pt-4 border-t border-[#2A2A2A]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#8EB4FF]" />
                <h2 className="text-sm font-bold text-white">
                  Open Library Archive Results
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setComicsOnlySearch(!comicsOnlySearch)}
                className="text-[11px] mal-link"
              >
                Scope: {comicsOnlySearch ? "Comics & Manga only" : "All Open Library books"}
              </button>
            </div>

            {searchingRemote && deduplicatedRemote.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[2/3] bg-[#1C1C1C]" />
                ))}
              </div>
            ) : remoteError ? (
              <p className="text-xs text-[#9B9B9B]">
                Open Library is unreachable right now. Curated catalog search still works
                offline.
              </p>
            ) : deduplicatedRemote.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {deduplicatedRemote.map((novel) => (
                  <NovelCard
                    key={novel.id}
                    novel={novel}
                    onLogClick={(n) => setLogNovel(n)}
                  />
                ))}
              </div>
            ) : !searchingRemote ? (
              <p className="text-xs text-[#9B9B9B]">
                No additional Open Library covers found for &ldquo;{query}&rdquo;.
              </p>
            ) : null}
          </section>
        )}

        {/* Editorial Collections Strip */}
        {!query && (
          <section className="pt-4 border-t border-[#2A2A2A] space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">
                Interest Stacks &amp; Curated Lists
              </h2>
              <Link
                href="/lists/"
                className="inline-flex items-center gap-1 text-xs mal-link"
              >
                View all lists <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {EDITORIAL_COLLECTIONS.map((col) => {
                const books = col.novelIds
                  .map((id) => getCuratedNovelById(id))
                  .filter(Boolean) as GraphicNovel[];
                return (
                  <Link
                    key={col.id}
                    href={`/lists/#${col.id}`}
                    className={cn(
                      "border border-[#2C2C2C] bg-gradient-to-b p-3 hover:border-[#4C74D6] transition-colors",
                      col.accent
                    )}
                  >
                    <div className="flex -space-x-3 mb-2.5 overflow-hidden">
                      {books.slice(0, 5).map((b) => (
                        <div
                          key={b.id}
                          className="h-16 w-11 shrink-0 border border-[#333333] bg-[#222222] overflow-hidden shadow"
                        >
                          <img
                            src={b.coverUrl}
                            alt={b.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                    <h3 className="text-xs font-bold text-[#8EB4FF]">{col.title}</h3>
                    <p className="mt-0.5 text-[11px] text-[#9B9B9B] line-clamp-2">
                      {col.subtitle}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <LogModal
        open={Boolean(logNovel)}
        onClose={() => setLogNovel(null)}
        initialNovel={logNovel}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1080px] border-x border-[#2A2A2A] bg-[#121212] p-6">
          <Skeleton className="h-96 w-full bg-[#1C1C1C]" />
        </div>
      }
    >
      <HomePageClient />
    </Suspense>
  );
}
