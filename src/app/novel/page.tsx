"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Eye,
  Heart,
  Layers,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListActions } from "@/components/ListActions";
import { NovelCard } from "@/components/NovelCard";
import { StarRating } from "@/components/StarRating";
import { CURATED_NOVELS, getCuratedNovelById } from "@/lib/catalog";
import { fetchOpenLibraryWork, getCachedNovel } from "@/lib/openlibrary";
import { getStatusMeta } from "@/lib/status";
import { useGNovel } from "@/lib/storage";
import type { GraphicNovel } from "@/lib/types";

function NovelDetailClient() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const olParam = searchParams.get("ol");

  const { state, deleteDiaryLog } = useGNovel();

  const [novel, setNovel] = useState<GraphicNovel | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      if (idParam) {
        const curated = getCuratedNovelById(idParam);
        if (curated) {
          if (active) {
            setNovel(curated);
            setLoading(false);
          }
          return;
        }
        const fromLibrary = state.library[idParam]?.novel || getCachedNovel(idParam);
        if (fromLibrary && active) {
          setNovel(fromLibrary);
          setLoading(false);
          return;
        }
      }

      if (olParam) {
        const normalizedId = `ol-${olParam}`;
        const curatedByOl = CURATED_NOVELS.find((n) => n.olKey === olParam);
        if (curatedByOl) {
          if (active) {
            setNovel(curatedByOl);
            setLoading(false);
          }
          return;
        }

        const cached = state.library[normalizedId]?.novel || getCachedNovel(normalizedId);
        if (cached && active) {
          setNovel(cached);
          setLoading(false);
        }

        const enriched = await fetchOpenLibraryWork(olParam, cached);
        if (active) {
          if (enriched) setNovel(enriched);
          setLoading(false);
        }
        return;
      }

      if (active) {
        setNovel(null);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [idParam, olParam, state.library]);

  const userLogs = useMemo(() => {
    if (!novel) return [];
    return state.diary.filter((d) => d.novelId === novel.id);
  }, [novel, state.diary]);

  const relatedNovels = useMemo(() => {
    if (!novel) return [];
    return CURATED_NOVELS.filter((other) => {
      if (other.id === novel.id) return false;
      const sharedGenre = other.genres.some((g) => novel.genres.includes(g));
      const sharedWriter = other.writers.some((w) => novel.writers.includes(w));
      return sharedGenre || sharedWriter;
    })
      .sort((a, b) => {
        const scoreA =
          a.genres.filter((g) => novel.genres.includes(g)).length +
          (a.writers.some((w) => novel.writers.includes(w)) ? 2 : 0);
        const scoreB =
          b.genres.filter((g) => novel.genres.includes(g)).length +
          (b.writers.some((w) => novel.writers.includes(w)) ? 2 : 0);
        return scoreB - scoreA;
      })
      .slice(0, 6);
  }, [novel]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          <Skeleton className="w-64 aspect-[2/3] rounded-2xl shrink-0" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="container mx-auto max-w-screen-md px-4 py-24 text-center space-y-4">
        <h1 className="font-serif text-4xl">Graphic Novel Not Found</h1>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find that entry in the curated catalog or Open Library.
        </p>
        <Link href="/">
          <Button variant="secondary" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Discover
          </Button>
        </Link>
      </div>
    );
  }

  const userEntry = state.library[novel.id];

  return (
    <div className="relative pb-20">
      {/* Atmospheric Backdrop */}
      <div className="relative h-[34vh] min-h-[240px] w-full overflow-hidden border-b border-white/5">
        {novel.coverUrl && (
          <img
            src={novel.coverUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover blur-2xl scale-110 opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="container mx-auto max-w-screen-xl px-4 pt-5 relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-white/15 backdrop-blur-md hover:bg-black/75 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Discover
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-screen-xl px-4 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Sidebar */}
          <aside className="w-full md:w-64 shrink-0 space-y-5">
            <div className="aspect-[2/3] w-full max-w-[260px] mx-auto md:mx-0 overflow-hidden rounded-2xl bg-secondary border border-white/15 shadow-2xl">
              {novel.coverUrl ? (
                <img
                  src={novel.coverUrl}
                  alt={novel.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  {novel.title}
                </div>
              )}
            </div>

            <ListActions novel={novel} />

            {/* Fact Sheet */}
            <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-3 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Format</span>
                <span className="font-medium text-foreground">{novel.format}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Publisher</span>
                <span className="font-medium text-foreground text-right">{novel.publisher}</span>
              </div>
              {novel.year > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">First Published</span>
                  <span className="font-mono text-foreground">{novel.year}</span>
                </div>
              )}
              {novel.issues && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Issues</span>
                  <span className="font-mono text-foreground">{novel.issues}</span>
                </div>
              )}
              {novel.pages && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Pages</span>
                  <span className="font-mono text-foreground">{novel.pages}</span>
                </div>
              )}
              {novel.olKey && (
                <div className="pt-2 border-t border-white/10">
                  <a
                    href={`https://openlibrary.org/works/${novel.olKey}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <span>View on Open Library</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </aside>

          {/* Right Main Info */}
          <div className="flex-1 space-y-8 md:pt-20 min-w-0">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {novel.genres.map((g) => (
                  <Badge
                    key={g}
                    variant="secondary"
                    className="bg-secondary/80 border border-white/10 text-xs"
                  >
                    {g}
                  </Badge>
                ))}
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl leading-[1.08] tracking-tight text-foreground">
                {novel.title}{" "}
                {novel.year > 0 && (
                  <span className="font-mono text-xl sm:text-2xl text-muted-foreground font-normal ml-1">
                    {novel.year}
                  </span>
                )}
              </h1>

              {novel.subtitle && (
                <p className="text-base text-primary/90 font-medium">{novel.subtitle}</p>
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground pt-1">
                <span>
                  Written by{" "}
                  <strong className="text-foreground font-medium">
                    {novel.writers.join(", ")}
                  </strong>
                </span>
                <span>
                  Art by{" "}
                  <strong className="text-foreground font-medium">
                    {novel.artists.join(", ")}
                  </strong>
                </span>
              </div>
            </div>

            {/* Score & User Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-card/80 p-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">
                  Community Avg
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono text-primary flex items-center gap-1">
                    <Star className="h-5 w-5 fill-primary text-primary" />
                    {novel.communityScore.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({novel.ratingsCount.toLocaleString()})
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">
                  Your Rating
                </span>
                <div className="mt-1.5">
                  {userEntry && userEntry.rating > 0 ? (
                    <StarRating value={userEntry.rating} readonly size="sm" showLabel />
                  ) : (
                    <span className="text-sm text-muted-foreground">Not rated</span>
                  )}
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">
                  Your Diary Logs
                </span>
                <div className="mt-1 text-lg font-mono font-semibold text-foreground flex items-center gap-2">
                  <span>{userLogs.length}</span>
                  {userEntry?.liked && (
                    <Heart className="h-4 w-4 fill-rose-400 text-rose-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Synopsis */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Synopsis
              </h2>
              {novel.deck && (
                <p className="text-base sm:text-lg text-foreground/95 leading-relaxed font-medium">
                  {novel.deck}
                </p>
              )}
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                {novel.synopsis}
              </p>
            </div>

            {/* User Diary History for this book */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Your Diary &amp; Reviews ({userLogs.length})
                </h2>
                <Link href="/diary/" className="text-xs text-primary hover:underline">
                  Open full diary
                </Link>
              </div>

              {userLogs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-card/40 p-5 text-sm text-muted-foreground">
                  No diary logs for this graphic novel yet. Use{" "}
                  <strong className="text-foreground">Log or Review in Diary</strong> on
                  the left to record when you read it and save your thoughts.
                </div>
              ) : (
                <div className="space-y-3">
                  {userLogs.map((log) => {
                    const meta = getStatusMeta(log.status);
                    const hidden = log.spoiler && !revealedSpoilers[log.id];
                    return (
                      <div
                        key={log.id}
                        className="rounded-xl border border-white/10 bg-card p-4 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 font-mono text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              {log.date}
                            </span>
                            {meta && (
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                              >
                                {meta.label}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Layers className="h-3 w-3" />
                              {log.edition}
                            </span>
                            {log.reread && (
                              <span className="inline-flex items-center gap-1 text-sky-300">
                                <RotateCcw className="h-3 w-3" />
                                Re-read
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {log.rating > 0 && (
                              <StarRating value={log.rating} readonly size="xs" />
                            )}
                            <button
                              type="button"
                              onClick={() => deleteDiaryLog(log.id)}
                              className="text-muted-foreground hover:text-rose-400 transition-colors"
                              aria-label="Delete diary log"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {log.review && (
                          hidden ? (
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedSpoilers((prev) => ({
                                  ...prev,
                                  [log.id]: true,
                                }))
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Contains spoilers — click to reveal
                            </button>
                          ) : (
                            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                              {log.review}
                            </p>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Related Novels */}
            {relatedNovels.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  If You Liked This
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {relatedNovels.map((rel) => (
                    <NovelCard key={rel.id} novel={rel} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NovelDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-screen-xl px-4 py-12">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <NovelDetailClient />
    </Suspense>
  );
}
