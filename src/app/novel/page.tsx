"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Check,
  ExternalLink,
  Eye,
  NotebookPen,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ListActions } from "@/components/ListActions";
import { NovelCard, getNovelHref } from "@/components/NovelCard";
import { CreatorLinks } from "@/components/CreatorLinks";
import { StarRating } from "@/components/StarRating";
import { LogModal } from "@/components/LogModal";
import { CURATED_NOVELS, getCuratedNovelById } from "@/lib/catalog";
import {
  fetchOpenLibraryEnrichment,
  fetchOpenLibraryWork,
  getCachedNovel,
  getCreatorHref,
} from "@/lib/openlibrary";
import { MAL_SCORE_LABELS, STATUS_OPTIONS, getStatusMeta } from "@/lib/status";
import { useGNovel } from "@/lib/storage";
import type {
  GraphicNovel,
  OpenLibraryEnrichment,
  ReadingStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type DetailTab = "details" | "issues" | "editions" | "reviews" | "recs";

function NovelDetailClient() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const olParam = searchParams.get("ol");

  const {
    state,
    getEntry,
    setStatus,
    setRating,
    setProgress,
    deleteDiaryLog,
  } = useGNovel();

  const [novel, setNovel] = useState<GraphicNovel | null>(null);
  const [enrichment, setEnrichment] = useState<OpenLibraryEnrichment | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [logOpen, setLogOpen] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setEnrichment(null);

      let resolved: GraphicNovel | null = null;

      if (idParam) {
        resolved =
          getCuratedNovelById(idParam) ||
          state.library[idParam]?.novel ||
          getCachedNovel(idParam) ||
          null;
      } else if (olParam) {
        const normalizedId = `ol-${olParam}`;
        const curatedByOl = CURATED_NOVELS.find((n) => n.olKey === olParam);
        if (curatedByOl) {
          resolved = curatedByOl;
        } else {
          const cached = state.library[normalizedId]?.novel || getCachedNovel(normalizedId);
          if (cached && active) {
            setNovel(cached);
            setLoading(false);
          }
          resolved = await fetchOpenLibraryWork(olParam, cached);
        }
      }

      if (active) {
        setNovel(resolved);
        setLoading(false);
      }

      const olKey = resolved?.olKey || olParam;
      if (olKey) {
        const extra = await fetchOpenLibraryEnrichment(olKey);
        if (active && extra) {
          setEnrichment(extra);
        }
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
      return (
        other.genres.some((g) => novel.genres.includes(g)) ||
        other.writers.some((w) => novel.writers.includes(w))
      );
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
      <div className="mx-auto max-w-[1080px] border-x border-[#2A2A2A] bg-[#121212] p-4">
        <Skeleton className="h-9 w-full mb-4 bg-[#222222]" />
        <div className="grid grid-cols-1 md:grid-cols-[235px_1fr] gap-5">
          <Skeleton className="h-96 bg-[#1C1C1C]" />
          <Skeleton className="h-96 bg-[#1C1C1C]" />
        </div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="mx-auto max-w-[1080px] border-x border-b border-[#2A2A2A] bg-[#121212] px-6 py-20 text-center space-y-3">
        <h1 className="text-xl font-bold text-white">Entry Not Found</h1>
        <p className="text-xs text-[#9B9B9B]">
          This graphic novel could not be loaded from the catalog or Open Library.
        </p>
        <Link href="/" className="inline-block text-xs mal-link">
          ← Return to Graphic Novels
        </Link>
      </div>
    );
  }

  const userEntry = getEntry(novel.id);
  const currentStatus = userEntry?.status || "none";
  const currentRating = userEntry?.rating || 0;
  const issuesRead = userEntry?.issuesRead || 0;

  // Prefer live Open Library ratings only if non-curated and Open Library has ratings
  const displayScore =
    !novel.isCurated && enrichment?.average10
      ? enrichment.average10.toFixed(2)
      : novel.communityScore.toFixed(2);
  const displayRatingsCount =
    !novel.isCurated && enrichment?.ratingsCount
      ? enrichment.ratingsCount
      : novel.ratingsCount;
  const displayMembers =
    !novel.isCurated && enrichment?.members
      ? enrichment.members
      : novel.membersCount || novel.ratingsCount * 6;

  const tabs: { id: DetailTab; label: string }[] = [
    { id: "details", label: "Details" },
    {
      id: "issues",
      label: novel.issuesList ? `Issues (${novel.issuesList.length})` : "Issues / Chapters",
    },
    {
      id: "editions",
      label: enrichment?.editions?.length
        ? `Editions (${enrichment.editions.length})`
        : "Editions",
    },
    { id: "reviews", label: `Reviews (${userLogs.length})` },
    { id: "recs", label: "Recommendations" },
  ];

  const handleQuickStatus = (val: string) => {
    if (val === "none") {
      if (currentStatus !== "none") setStatus(novel, currentStatus);
    } else {
      const target = val as Exclude<ReadingStatus, "none">;
      if (currentStatus !== target) setStatus(novel, target);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-[1080px] border-x border-b border-[#2A2A2A] bg-[#121212]">
        {/* MAL Title Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E2E2E] bg-[#222222] px-4 py-2.5">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">
              {novel.title}
            </h1>
            {novel.subtitle && (
              <p className="text-xs text-[#9B9B9B]">{novel.subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs mal-link"
          >
            <NotebookPen className="h-3.5 w-3.5" />
            Log / Edit
          </button>
        </div>

        {/* MAL 2-Column Database Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
          {/* LEFT SIDEBAR */}
          <aside className="border-b md:border-b-0 md:border-r border-[#2A2A2A] p-3 space-y-4 text-xs">
            {/* Cover */}
            <div className="mx-auto max-w-[220px] md:max-w-none aspect-[2/3] overflow-hidden rounded-[3px] border border-[#303030] bg-[#1A1A1A]">
              {novel.coverUrl ? (
                <img
                  src={novel.coverUrl}
                  alt={novel.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-[#9B9B9B]">
                  {novel.title}
                </div>
              )}
            </div>

            {/* Edit Status Box + Favorites + Lists + Reader Link */}
            <ListActions novel={novel} />

            {/* Alternative Titles */}
            {(novel.altTitles?.length || novel.subtitle) && (
              <div className="space-y-1.5">
                <h2 className="border-b border-[#2E2E2E] pb-1 font-bold text-[#E5E5E5]">
                  Alternative Titles
                </h2>
                {novel.subtitle && (
                  <p className="text-[11px] text-[#CCCCCC]">
                    <span className="text-[#9B9B9B]">Subtitle:</span> {novel.subtitle}
                  </p>
                )}
                {novel.altTitles?.map((alt) => (
                  <p key={alt} className="text-[11px] text-[#CCCCCC]">
                    <span className="text-[#9B9B9B]">Synonym:</span> {alt}
                  </p>
                ))}
              </div>
            )}

            {/* Information Table */}
            <div className="space-y-1.5">
              <h2 className="border-b border-[#2E2E2E] pb-1 font-bold text-[#E5E5E5]">
                Information
              </h2>
              <dl className="space-y-1.5 text-[11px]">
                <div>
                  <dt className="inline text-[#9B9B9B]">Type: </dt>
                  <dd className="inline text-[#8EB4FF]">{novel.format}</dd>
                </div>
                {novel.issues && (
                  <div>
                    <dt className="inline text-[#9B9B9B]">Issues: </dt>
                    <dd className="inline text-[#E5E5E5] tabular-nums">{novel.issues}</dd>
                  </div>
                )}
                {novel.pages && (
                  <div>
                    <dt className="inline text-[#9B9B9B]">Pages: </dt>
                    <dd className="inline text-[#E5E5E5] tabular-nums">{novel.pages}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline text-[#9B9B9B]">Status: </dt>
                  <dd className="inline text-[#E5E5E5]">
                    {novel.publicationStatus || "Finished"}
                  </dd>
                </div>
                {novel.year > 0 && (
                  <div>
                    <dt className="inline text-[#9B9B9B]">Published: </dt>
                    <dd className="inline text-[#E5E5E5]">{novel.year}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline text-[#9B9B9B]">Publisher: </dt>
                  <dd className="inline text-[#8EB4FF]">{novel.publisher}</dd>
                </div>
                <div>
                  <dt className="inline text-[#9B9B9B]">Genres: </dt>
                  <dd className="inline text-[#8EB4FF]">{novel.genres.join(", ")}</dd>
                </div>
                <div>
                  <dt className="inline text-[#9B9B9B]">Writers: </dt>
                  <dd className="inline">
                    <CreatorLinks names={novel.writers} />
                  </dd>
                </div>
                <div>
                  <dt className="inline text-[#9B9B9B]">Artists: </dt>
                  <dd className="inline">
                    <CreatorLinks names={novel.artists} />
                  </dd>
                </div>
              </dl>
            </div>

            {/* Statistics Table */}
            <div className="space-y-1.5">
              <h2 className="border-b border-[#2E2E2E] pb-1 font-bold text-[#E5E5E5]">
                Statistics
              </h2>
              <dl className="space-y-1.5 text-[11px]">
                <div>
                  <dt className="inline text-[#9B9B9B]">Score: </dt>
                  <dd className="inline font-bold text-white tabular-nums">
                    {displayScore}
                  </dd>
                  <span className="text-[#9B9B9B]">
                    {" "}
                    (scored by {displayRatingsCount.toLocaleString()} users)
                  </span>
                </div>
                {novel.ranked && (
                  <div>
                    <dt className="inline text-[#9B9B9B]">Ranked: </dt>
                    <dd className="inline text-white tabular-nums">#{novel.ranked}</dd>
                  </div>
                )}
                {novel.popularity && (
                  <div>
                    <dt className="inline text-[#9B9B9B]">Popularity: </dt>
                    <dd className="inline text-white tabular-nums">#{novel.popularity}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline text-[#9B9B9B]">Members: </dt>
                  <dd className="inline text-white tabular-nums">
                    {displayMembers.toLocaleString()}
                  </dd>
                </div>
                {enrichment?.wantToRead !== undefined && (
                  <div>
                    <dt className="inline text-[#9B9B9B]">Open Library Shelves: </dt>
                    <dd className="inline text-[#CCCCCC] tabular-nums">
                      {enrichment.alreadyRead} read · {enrichment.wantToRead} plan
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {novel.olKey && (
              <div className="pt-2 border-t border-[#2A2A2A] text-[11px]">
                <a
                  href={`https://openlibrary.org/works/${novel.olKey}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 mal-link"
                >
                  Open Library Record
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </aside>

          {/* RIGHT MAIN COLUMN */}
          <div className="p-3 sm:p-4 space-y-4 min-w-0">
            {/* MAL Sub-Nav Underline Tabs */}
            <div className="flex items-end gap-0.5 overflow-x-auto border-b border-[#34549E] text-xs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "shrink-0 px-2.5 py-1 rounded-t-[3px] transition-colors",
                    activeTab === tab.id
                      ? "bg-[#E2E8F4] text-[#141414] font-bold"
                      : "text-[#8EB4FF] hover:text-white hover:bg-[#1E1E1E]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Breadcrumbs */}
            <div className="text-[11px] text-[#9B9B9B] flex flex-wrap items-center gap-1">
              <Link href="/" className="mal-link">
                Top
              </Link>
              <span>&gt;</span>
              <Link href="/" className="mal-link">
                Graphic Novels
              </Link>
              <span>&gt;</span>
              <span className="text-[#E5E5E5]">{novel.title}</span>
            </div>

            {/* Iconic MAL Score & Inline Action Box */}
            <div className="space-y-1.5">
              <div className="rounded-[4px] border border-[#2C2C2C] bg-[#1C1C1C] overflow-hidden">
                <div className="flex flex-wrap items-center gap-5 px-3.5 py-3">
                  {/* Blue SCORE block */}
                  <div className="flex flex-col items-center pr-5 border-r border-[#303030]">
                    <span className="w-full text-center rounded-[2px] bg-[#2E51A2] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Score
                    </span>
                    <span className="mt-1 text-[26px] font-bold text-white leading-none tabular-nums">
                      {displayScore}
                    </span>
                    <span className="mt-1 text-[10px] text-[#9B9B9B] tabular-nums">
                      {displayRatingsCount.toLocaleString()} users
                    </span>
                  </div>

                  {/* Ranked / Popularity / Members */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                      {novel.ranked && (
                        <span>
                          <span className="text-[#B0B0B0]">Ranked </span>
                          <strong className="font-bold text-white tabular-nums">
                            #{novel.ranked}
                          </strong>
                        </span>
                      )}
                      {novel.popularity && (
                        <span>
                          <span className="text-[#B0B0B0]">Popularity </span>
                          <strong className="font-bold text-white tabular-nums">
                            #{novel.popularity}
                          </strong>
                        </span>
                      )}
                      <span>
                        <span className="text-[#B0B0B0]">Members </span>
                        <strong className="font-bold text-white tabular-nums">
                          {displayMembers.toLocaleString()}
                        </strong>
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8EB4FF] flex flex-wrap items-center gap-2">
                      <span>{novel.year || "Archive"}</span>
                      <span className="text-[#444444]">|</span>
                      <span>{novel.format}</span>
                      <span className="text-[#444444]">|</span>
                      <span>{novel.publisher}</span>
                      <span className="text-[#444444]">|</span>
                      <CreatorLinks
                        names={Array.from(new Set([...novel.writers, ...novel.artists]))}
                        max={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Inline quick controls strip inside Score Box */}
                <div className="flex flex-wrap items-center gap-2 px-3.5 py-2 border-t border-[#2A2A2A] bg-[#181818] text-xs">
                  <select
                    value={currentStatus}
                    onChange={(e) => handleQuickStatus(e.target.value)}
                    aria-label="Reading Status"
                    className="h-7 rounded-[3px] border border-[#3A3A3A] bg-[#222222] px-2.5 text-xs font-medium text-white focus:outline-none focus:border-[#4C74D6]"
                  >
                    <option value="none">Add to My Shelf</option>
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <div className="inline-flex items-center gap-1 rounded-[3px] border border-[#3A3A3A] bg-[#222222] px-2.5 h-7">
                    <select
                      value={currentRating}
                      onChange={(e) => setRating(novel, Number(e.target.value))}
                      aria-label="Quick Score"
                      className="bg-transparent text-xs text-white focus:outline-none"
                    >
                      <option value={0} className="bg-[#181818]">
                        Select
                      </option>
                      {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n} className="bg-[#181818]">
                          {MAL_SCORE_LABELS[n]}
                        </option>
                      ))}
                    </select>
                    <Star
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        currentRating > 0
                          ? "fill-[#FACC15] text-[#FACC15]"
                          : "fill-[#FACC15]/70 text-[#FACC15]/70"
                      )}
                    />
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-[3px] border border-[#333333] bg-[#222222] px-2.5 h-7 text-xs text-[#CCCCCC] tabular-nums">
                    <span>Issues:</span>
                    <span className="text-white">
                      {issuesRead}/{novel.issues || "?"}
                    </span>
                  </div>

                  {userEntry?.customUrl && (
                    <a
                      href={userEntry.customUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 rounded-[3px] bg-[#2DB039]/20 border border-[#2DB039]/40 px-2.5 h-7 text-xs font-semibold text-[#4ADE80] hover:bg-[#2DB039]/30"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Read Source
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-[#D86C6C]">
                * Your list is saved locally.
              </p>
            </div>

            {/* TAB: DETAILS */}
            {activeTab === "details" && (
              <div className="space-y-6">
                {/* Synopsis */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2E2E2E] pb-1">
                    <h2 className="text-sm font-bold text-white">Synopsis</h2>
                  </div>
                  {novel.deck && (
                    <p className="text-xs sm:text-sm font-medium text-[#E5E5E5] leading-relaxed">
                      {novel.deck}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm text-[#CCCCCC] leading-relaxed whitespace-pre-line">
                    {novel.synopsis}
                  </p>
                </section>

                {/* Background */}
                {novel.background && (
                  <section className="space-y-2">
                    <h2 className="border-b border-[#2E2E2E] pb-1 text-sm font-bold text-white">
                      Background
                    </h2>
                    <p className="text-xs text-[#CCCCCC] leading-relaxed">
                      {novel.background}
                    </p>
                  </section>
                )}

                {/* Creators & Credits */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2E2E2E] pb-1">
                    <h2 className="text-sm font-bold text-white">
                      Creators (Writers &amp; Artists)
                    </h2>
                    <Link href="/creator/" className="text-xs mal-link">
                      Browse all creators
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Array.from(new Set([...novel.writers, ...novel.artists])).map(
                      (person) => {
                        const isW = novel.writers.includes(person);
                        const isA = novel.artists.includes(person);
                        const role =
                          isW && isA
                            ? "Writer & Artist"
                            : isA
                            ? "Artist"
                            : "Writer";
                        const initials = person
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase() || "")
                          .join("");
                        return (
                          <Link
                            key={person}
                            href={getCreatorHref(person)}
                            className="flex items-center gap-2.5 rounded-[4px] border border-[#2C2C2C] bg-[#161616] p-2 hover:border-[#4C74D6] transition-colors"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] bg-[#2E51A2]/25 border border-[#4C74D6]/40 text-xs font-bold text-[#8EB4FF]">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-bold mal-link truncate">
                                {person}
                              </span>
                              <span className="block text-[11px] text-[#9B9B9B]">
                                {role} · View profile &amp; works
                              </span>
                            </div>
                          </Link>
                        );
                      }
                    )}
                  </div>
                </section>

                {/* Issues / Chapters Preview */}
                {novel.issuesList && novel.issuesList.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between border-b border-[#2E2E2E] pb-1">
                      <h2 className="text-sm font-bold text-white">
                        Issues / Chapters
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab("issues")}
                        className="text-xs mal-link"
                      >
                        View all ({novel.issuesList.length})
                      </button>
                    </div>
                    <div className="divide-y divide-[#252525] rounded-[4px] border border-[#2C2C2C] bg-[#161616] overflow-hidden">
                      {novel.issuesList.slice(0, 5).map((issue) => {
                        const done = issuesRead >= issue.number;
                        return (
                          <div
                            key={issue.number}
                            className="flex items-center justify-between px-3 py-2 text-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-[#9B9B9B] w-7 shrink-0 tabular-nums">
                                #{issue.number}
                              </span>
                              <span className="truncate text-[#E5E5E5]">
                                {issue.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {issue.date && (
                                <span className="text-[11px] text-[#9B9B9B]">
                                  {issue.date}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setProgress(novel, done ? issue.number - 1 : issue.number)
                                }
                                className={cn(
                                  "px-2 py-0.5 rounded-[3px] border text-[11px]",
                                  done
                                    ? "bg-[#2E51A2] border-[#4C74D6] text-white"
                                    : "bg-[#222222] border-[#333333] text-[#9B9B9B] hover:text-white"
                                )}
                              >
                                {done ? "Read ✓" : "Mark"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Related Entries (AniList relations or curated matches) */}
                {(novel.relatedEntries?.length || relatedNovels.length > 0) && (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between border-b border-[#2E2E2E] pb-1">
                      <h2 className="text-sm font-bold text-white">Related Entries</h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab("recs")}
                        className="text-xs mal-link"
                      >
                        More recommendations
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {novel.relatedEntries?.length
                        ? novel.relatedEntries.slice(0, 4).map((rel) => (
                            <Link
                              key={rel.id}
                              href={rel.href}
                              className="flex gap-2.5 rounded-[4px] border border-[#2C2C2C] bg-[#161616] p-2 hover:border-[#4C74D6] transition-colors"
                            >
                              <div className="w-11 h-16 shrink-0 rounded-[2px] bg-[#222222] overflow-hidden">
                                {rel.coverUrl && (
                                  <img
                                    src={rel.coverUrl}
                                    alt={rel.title}
                                    className="h-full w-full object-cover"
                                  />
                                )}
                              </div>
                              <div className="min-w-0 text-xs space-y-0.5">
                                <span className="text-[10px] text-[#9B9B9B] block">
                                  {rel.relation}
                                </span>
                                <span className="font-semibold mal-link block truncate">
                                  {rel.title}
                                </span>
                                <span className="text-[11px] text-[#9B9B9B] block truncate">
                                  {rel.format}
                                </span>
                              </div>
                            </Link>
                          ))
                        : relatedNovels.slice(0, 4).map((rel) => {
                            const sameWriter = rel.writers.some((w) =>
                              novel.writers.includes(w)
                            );
                            return (
                              <Link
                                key={rel.id}
                                href={getNovelHref(rel)}
                                className="flex gap-2.5 rounded-[4px] border border-[#2C2C2C] bg-[#161616] p-2 hover:border-[#4C74D6] transition-colors"
                              >
                                <div className="w-11 h-16 shrink-0 rounded-[2px] bg-[#222222] overflow-hidden">
                                  {rel.coverUrl && (
                                    <img
                                      src={rel.coverUrl}
                                      alt={rel.title}
                                      className="h-full w-full object-cover"
                                    />
                                  )}
                                </div>
                                <div className="min-w-0 text-xs space-y-0.5">
                                  <span className="text-[10px] text-[#9B9B9B] uppercase block">
                                    {sameWriter ? "Same Writer" : rel.genres[0]}
                                  </span>
                                  <span className="font-semibold mal-link block truncate">
                                    {rel.title}
                                  </span>
                                  <span className="text-[11px] text-[#9B9B9B] block truncate">
                                    {rel.format} · {rel.year}
                                  </span>
                                </div>
                              </Link>
                            );
                          })}
                    </div>
                  </section>
                )}

                {/* Reviews */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2E2E2E] pb-1">
                    <h2 className="text-sm font-bold text-white">
                      Your Reviews &amp; Diary ({userLogs.length})
                    </h2>
                    <button
                      type="button"
                      onClick={() => setLogOpen(true)}
                      className="text-xs mal-link"
                    >
                      Write a review
                    </button>
                  </div>
                  <ReviewsList
                    logs={userLogs}
                    revealedSpoilers={revealedSpoilers}
                    onReveal={(id) =>
                      setRevealedSpoilers((prev) => ({ ...prev, [id]: true }))
                    }
                    onDelete={deleteDiaryLog}
                  />
                </section>
              </div>
            )}

            {/* TAB: ISSUES / CHAPTERS */}
            {activeTab === "issues" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E2E2E] pb-2">
                  <h2 className="text-sm font-bold text-white">
                    Issues / Chapters Tracker
                  </h2>
                  <span className="text-xs font-mono text-[#CCCCCC]">
                    Progress: {issuesRead} / {novel.issues || "?"}
                  </span>
                </div>

                {novel.issuesList && novel.issuesList.length > 0 ? (
                  <div className="rounded-[4px] border border-[#2C2C2C] divide-y divide-[#252525] bg-[#161616] overflow-hidden">
                    {novel.issuesList.map((issue) => {
                      const done = issuesRead >= issue.number;
                      return (
                        <div
                          key={issue.number}
                          className="flex items-center justify-between px-3 py-2 text-xs hover:bg-[#1E1E1E]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[#9B9B9B] w-8 shrink-0 tabular-nums">
                              #{issue.number}
                            </span>
                            <span className="text-[#E5E5E5] truncate">
                              {issue.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {issue.date && (
                              <span className="text-[11px] text-[#9B9B9B]">
                                {issue.date}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setProgress(novel, done ? issue.number - 1 : issue.number)
                              }
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[3px] border text-[11px]",
                                done
                                  ? "bg-[#2E51A2] border-[#4C74D6] text-white"
                                  : "bg-[#222222] border-[#333333] text-[#9B9B9B] hover:text-white"
                              )}
                            >
                              {done && <Check className="h-3 w-3" />}
                              {done ? "Read" : "Mark Read"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[4px] border border-[#2C2C2C] bg-[#161616] p-4 text-xs text-[#9B9B9B] space-y-2">
                    <p>
                      No chapter breakdown is archived for this edition yet. You can still
                      track your exact issue/chapter count in the left sidebar or attach
                      your own reader URL under{" "}
                      <strong className="text-[#E5E5E5]">Reader / Source Link</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: EDITIONS */}
            {activeTab === "editions" && (
              <div className="space-y-3">
                <h2 className="border-b border-[#2E2E2E] pb-1 text-sm font-bold text-white">
                  Published Editions (via Open Library)
                </h2>
                {enrichment?.editions?.length ? (
                  <div className="border border-[#2C2C2C] divide-y divide-[#252525] bg-[#161616]">
                    {enrichment.editions.map((ed) => (
                      <div
                        key={ed.key}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <a
                            href={`https://openlibrary.org${ed.key}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium mal-link"
                          >
                            {ed.title}
                          </a>
                          <p className="text-[11px] text-[#9B9B9B]">
                            {ed.publishers.join(", ") || "Unknown publisher"}
                            {ed.format ? ` · ${ed.format}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[11px] text-[#CCCCCC]">
                          {ed.pages && <span>{ed.pages} pp.</span>}
                          {ed.publishDate && <span>{ed.publishDate}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#9B9B9B]">
                    No Open Library editions loaded for this entry.
                  </p>
                )}
              </div>
            )}

            {/* TAB: REVIEWS */}
            {activeTab === "reviews" && (
              <div className="space-y-4">
                {enrichment?.ratingCounts && (
                  <div className="border border-[#2C2C2C] bg-[#161616] p-3 space-y-2">
                    <h3 className="text-xs font-bold text-white">
                      Open Library Community Score Breakdown
                    </h3>
                    <div className="space-y-1">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const cnt = enrichment.ratingCounts?.[String(star)] || 0;
                        const total = enrichment.ratingsCount || 1;
                        const pct = Math.round((cnt / total) * 100);
                        return (
                          <div
                            key={star}
                            className="flex items-center gap-2 text-[11px] font-mono"
                          >
                            <span className="w-8 text-[#9B9B9B]">{star}★</span>
                            <div className="flex-1 h-2 bg-[#222222] overflow-hidden">
                              <div
                                className="h-full bg-[#2E51A2]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-12 text-right text-[#CCCCCC]">
                              {pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-[#2E2E2E] pb-1">
                  <h2 className="text-sm font-bold text-white">
                    Your Diary Reviews ({userLogs.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setLogOpen(true)}
                    className="text-xs mal-link"
                  >
                    + Add Review
                  </button>
                </div>

                <ReviewsList
                  logs={userLogs}
                  revealedSpoilers={revealedSpoilers}
                  onReveal={(id) =>
                    setRevealedSpoilers((prev) => ({ ...prev, [id]: true }))
                  }
                  onDelete={deleteDiaryLog}
                />
              </div>
            )}

            {/* TAB: RECOMMENDATIONS */}
            {activeTab === "recs" && (
              <div className="space-y-3">
                <h2 className="border-b border-[#2E2E2E] pb-1 text-sm font-bold text-white">
                  Recommended If You Liked {novel.title}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {relatedNovels.map((rel) => (
                    <NovelCard key={rel.id} novel={rel} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <LogModal open={logOpen} onClose={() => setLogOpen(false)} initialNovel={novel} />
    </>
  );
}

function ReviewsList({
  logs,
  revealedSpoilers,
  onReveal,
  onDelete,
}: {
  logs: ReturnType<typeof useGNovel>["state"]["diary"];
  revealedSpoilers: Record<string, boolean>;
  onReveal: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (logs.length === 0) {
    return (
      <div className="rounded-[4px] border border-[#2C2C2C] bg-[#161616] p-4 text-xs text-[#9B9B9B]">
        No diary logs or reviews recorded yet for this title.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {logs.map((log) => {
        const meta = getStatusMeta(log.status);
        const hidden = log.spoiler && !revealedSpoilers[log.id];
        return (
          <div
            key={log.id}
            className="rounded-[4px] border border-[#2C2C2C] bg-[#161616] p-3 space-y-2 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#242424] pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#9B9B9B] tabular-nums">{log.date}</span>
                {meta && (
                  <span
                    className={`rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                  >
                    {meta.label}
                  </span>
                )}
                <span className="text-[#9B9B9B]">{log.edition}</span>
                {log.reread && (
                  <span className="inline-flex items-center gap-1 text-[#8EB4FF]">
                    <RotateCcw className="h-3 w-3" />
                    Re-read
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <StarRating value={log.rating} readonly size="xs" showLabel />
                <button
                  type="button"
                  onClick={() => onDelete(log.id)}
                  className="text-[#9B9B9B] hover:text-[#FB7185]"
                  aria-label="Delete review"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {log.review &&
              (hidden ? (
                <button
                  type="button"
                  onClick={() => onReveal(log.id)}
                  className="inline-flex items-center gap-1 border border-[#E7B715]/40 bg-[#E7B715]/10 px-2.5 py-1 text-[11px] text-[#FACC15]"
                >
                  <Eye className="h-3 w-3" />
                  Contains spoilers — reveal
                </button>
              ) : (
                <p className="text-xs text-[#E5E5E5] leading-relaxed whitespace-pre-line">
                  {log.review}
                </p>
              ))}
          </div>
        );
      })}
    </div>
  );
}

export default function NovelDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1080px] border-x border-[#2A2A2A] bg-[#121212] p-6">
          <Skeleton className="h-72 w-full bg-[#1C1C1C]" />
        </div>
      }
    >
      <NovelDetailClient />
    </Suspense>
  );
}
