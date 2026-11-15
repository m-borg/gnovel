"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Globe,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NovelCard } from "@/components/NovelCard";
import { LogModal } from "@/components/LogModal";
import {
  ALL_GENRES,
  CURATED_NOVELS,
  EDITORIAL_COLLECTIONS,
  getCuratedNovelById,
} from "@/lib/catalog";
import { searchOpenLibrary } from "@/lib/openlibrary";
import { useGNovel } from "@/lib/storage";
import type { GraphicNovel, NovelFormat } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortOption = "featured" | "rating" | "newest" | "oldest" | "title";
const FORMAT_FILTERS: ("All" | NovelFormat)[] = [
  "All",
  "Graphic Novel",
  "Series",
  "Manga",
  "Omnibus",
];

export default function HomePage() {
  const { state, mounted, loadStarterShelf } = useGNovel();

  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [selectedFormat, setSelectedFormat] = useState<"All" | NovelFormat>("All");
  const [sortBy, setSortBy] = useState<SortOption>("featured");

  const [remoteResults, setRemoteResults] = useState<GraphicNovel[]>([]);
  const [searchingRemote, setSearchingRemote] = useState(false);
  const [remoteError, setRemoteError] = useState(false);
  const [comicsOnlySearch, setComicsOnlySearch] = useState(true);

  const [logNovel, setLogNovel] = useState<GraphicNovel | null>(null);

  const handleQueryChange = (next: string) => {
    setQuery(next);
    if (next.trim().length < 2) {
      setRemoteResults([]);
      setSearchingRemote(false);
      setRemoteError(false);
    }
  };

  // Live Open Library search when user types >= 2 chars
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

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
      if (selectedGenre !== "All" && !novel.genres.includes(selectedGenre)) {
        return false;
      }
      if (selectedFormat !== "All" && novel.format !== selectedFormat) {
        return false;
      }
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
    if (sortBy === "rating") {
      copy.sort((a, b) => b.communityScore - a.communityScore);
    } else if (sortBy === "newest") {
      copy.sort((a, b) => b.year - a.year);
    } else if (sortBy === "oldest") {
      copy.sort((a, b) => a.year - b.year);
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
    <div className="pb-12">
      {/* Editorial Hero */}
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#1A2029] via-[#14181E] to-background bg-grid-subtle">
        <div className="container mx-auto max-w-screen-2xl px-4 py-12 md:py-16">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Your Letterboxd &amp; Backloggd for Graphic Novels</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl leading-[1.05] tracking-tight text-foreground">
              Track every panel.{" "}
              <span className="text-primary">Remember every world.</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Rate comics, trades, omnibuses, and manga with half-stars. Keep a reading
              diary, track issue progress, and curate shelves—stored right in your
              browser.
            </p>

            {/* Unified Search Bar */}
            <div className="pt-2 space-y-2.5">
              <div className="relative max-w-2xl">
                <Search className="h-4 w-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search Watchmen, Alan Moore, Akira, Saga, or any title..."
                  className="h-12 pl-11 pr-24 rounded-xl bg-card/90 border-white/15 text-base shadow-lg focus-visible:ring-primary"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => handleQueryChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {mounted && trackedCount === 0 ? (
                  <button
                    type="button"
                    onClick={loadStarterShelf}
                    className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Preview with a sample shelf &amp; diary
                  </button>
                ) : mounted && trackedCount > 0 ? (
                  <Link
                    href="/shelf/"
                    className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    <span>You have {trackedCount} novels on your shelf</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}

                {query.trim().length >= 2 && (
                  <button
                    type="button"
                    onClick={() => setComicsOnlySearch(!comicsOnlySearch)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-secondary/60 px-2.5 py-0.5 hover:text-foreground transition-colors"
                  >
                    <Globe className="h-3 w-3 text-sky-400" />
                    Open Library filter: {comicsOnlySearch ? "Comics & Manga" : "All Books"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters & Catalog */}
      <section className="container mx-auto max-w-screen-2xl px-4 pt-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
          {/* Genre Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {["All", ...ALL_GENRES].map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => setSelectedGenre(genre)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
                  selectedGenre === genre
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 text-muted-foreground border-white/5 hover:bg-secondary hover:text-foreground"
                )}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Format + Sort */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex items-center rounded-lg border border-white/10 bg-secondary/40 p-0.5">
              {FORMAT_FILTERS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setSelectedFormat(fmt)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    selectedFormat === fmt
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {fmt}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-secondary/40 px-2.5 py-1">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort catalog"
                className="bg-transparent text-xs font-medium text-foreground focus:outline-none"
              >
                <option value="featured" className="bg-card">Featured</option>
                <option value="rating" className="bg-card">Highest Rated</option>
                <option value="newest" className="bg-card">Newest First</option>
                <option value="oldest" className="bg-card">Oldest First</option>
                <option value="title" className="bg-card">Title A–Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Curated Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              {query ? `Curated Matches (${localMatches.length})` : "Curated Canon"}
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              {localMatches.length} {localMatches.length === 1 ? "title" : "titles"}
            </span>
          </div>

          {localMatches.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-7">
              {localMatches.map((novel) => (
                <NovelCard
                  key={novel.id}
                  novel={novel}
                  onLogClick={(n) => setLogNovel(n)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-card/50 p-8 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                No curated titles matched those filters.
              </p>
              {(selectedGenre !== "All" || selectedFormat !== "All") && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedGenre("All");
                    setSelectedFormat("All");
                  }}
                >
                  Reset filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Live Open Library Results (when searching) */}
        {query.trim().length >= 2 && (
          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-sky-400" />
                <h2 className="text-lg font-semibold tracking-tight">
                  Open Library Archive Results
                </h2>
              </div>
              {searchingRemote && (
                <span className="text-xs text-muted-foreground animate-pulse">
                  Searching Open Library...
                </span>
              )}
            </div>

            {searchingRemote && deduplicatedRemote.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-[2/3] w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : remoteError ? (
              <p className="text-sm text-muted-foreground">
                Could not reach Open Library right now. Curated search still works offline.
              </p>
            ) : deduplicatedRemote.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-7">
                {deduplicatedRemote.map((novel) => (
                  <NovelCard
                    key={novel.id}
                    novel={novel}
                    onLogClick={(n) => setLogNovel(n)}
                  />
                ))}
              </div>
            ) : !searchingRemote ? (
              <p className="text-sm text-muted-foreground">
                No extra archive covers found for &ldquo;{query}&rdquo;.
              </p>
            ) : null}
          </div>
        )}

        {/* Editorial Collections Strip (when not searching) */}
        {!query && (
          <div className="pt-10 border-t border-white/10 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Curated Reading Lists
                </h2>
                <p className="text-xs text-muted-foreground">
                  Starter shelves grouped by mood, era, and craft.
                </p>
              </div>
              <Link
                href="/lists/"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <span>View all lists</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {EDITORIAL_COLLECTIONS.map((col) => {
                const books = col.novelIds
                  .map((id) => getCuratedNovelById(id))
                  .filter(Boolean) as GraphicNovel[];
                return (
                  <Link
                    key={col.id}
                    href={`/lists/#${col.id}`}
                    className={cn(
                      "group rounded-2xl border border-white/10 bg-gradient-to-br p-4 transition-all hover:border-primary/40 hover:-translate-y-0.5",
                      col.accent
                    )}
                  >
                    <div className="flex -space-x-4 mb-4 overflow-hidden py-1">
                      {books.slice(0, 5).map((b) => (
                        <div
                          key={b.id}
                          className="h-20 w-14 shrink-0 rounded-md overflow-hidden border border-white/20 shadow-md bg-secondary"
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
                    <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                      {col.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {col.subtitle}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <LogModal
        open={Boolean(logNovel)}
        onClose={() => setLogNovel(null)}
        initialNovel={logNovel}
      />
    </div>
  );
}
