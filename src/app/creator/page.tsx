"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  PenTool,
  Search,
  Star,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LogModal } from "@/components/LogModal";
import { NovelCard, getNovelHref } from "@/components/NovelCard";
import { CreatorLinks } from "@/components/CreatorLinks";
import { CURATED_NOVELS, getCreatorDirectory } from "@/lib/catalog";
import {
  cacheNovelSnapshot,
  consolidateWorks,
  fetchCreatorProfile,
  fetchCreatorWorks,
  getCreatorHref,
  type CatalogSortMode,
} from "@/lib/openlibrary";
import { STATUS_OPTIONS, getStatusMeta } from "@/lib/status";
import { useGNovel } from "@/lib/storage";
import type { CreatorProfile, GraphicNovel, ReadingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AuthorSearchHit {
  key: string;
  name: string;
  workCount: number;
  topWork?: string;
}

function CreatorPageClient() {
  const searchParams = useSearchParams();
  const creatorName = searchParams.get("name")?.trim() || "";

  if (!creatorName) {
    return <CreatorDirectory />;
  }

  return <CreatorProfileView key={creatorName} creatorName={creatorName} />;
}

function CreatorDirectory() {
  const router = useRouter();
  const directory = useMemo(() => getCreatorDirectory(), []);
  const [search, setSearch] = useState("");
  const [remoteAuthors, setRemoteAuthors] = useState<AuthorSearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (val.trim().length < 2) {
      setRemoteAuthors([]);
      setSearching(false);
    }
  };

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(
            q
          )}&limit=12`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        const docs = (data.docs || []) as {
          key?: string;
          name?: string;
          work_count?: number;
          top_work?: string;
        }[];
        setRemoteAuthors(
          docs
            .filter((d) => d.key && d.name && (d.work_count || 0) > 0)
            .map((d) => ({
              key: d.key!,
              name: d.name!,
              workCount: d.work_count || 0,
              topWork: d.top_work,
            }))
        );
      } catch {
        // Ignore abort
      } finally {
        setSearching(false);
      }
    }, 320);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  const filteredCurated = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.curatedWorks.some((w) => w.title.toLowerCase().includes(q))
    );
  }, [directory, search]);

  return (
    <div className="mx-auto max-w-[1080px] border-x border-b border-[#2A2A2A] bg-[#121212]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E2E2E] bg-[#222222] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <PenTool className="h-4 w-4 text-[#8EB4FF]" />
          <h1 className="text-base sm:text-lg font-bold text-white">
            Writers &amp; Artists Directory
          </h1>
        </div>
        <span className="text-xs text-[#9B9B9B]">
          Click any creator to open their full biography &amp; works
        </span>
      </div>

      <div className="p-3 sm:p-4 space-y-6">
        {/* Live Creator Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (search.trim()) {
              router.push(getCreatorHref(search.trim()));
            }
          }}
          className="flex flex-col sm:flex-row gap-2 max-w-xl"
        >
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 text-[#9B9B9B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search any comic writer or artist (e.g. Grant Morrison, Frank Miller)..."
              className="h-8 pl-8 rounded-[3px] border-[#333333] bg-[#101010] text-xs"
            />
          </div>
          <button
            type="submit"
            className="h-8 px-3 rounded-[3px] bg-[#2E51A2] hover:bg-[#3A62BE] text-xs font-semibold text-white shrink-0"
          >
            Open Profile
          </button>
        </form>

        {/* Live Open Library Author Matches */}
        {search.trim().length >= 2 && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#2E2E2E] pb-1">
              <h2 className="text-sm font-bold text-white">
                Open Library Creator Matches
              </h2>
              {searching && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8EB4FF]" />
              )}
            </div>

            {remoteAuthors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {remoteAuthors.map((author) => (
                  <Link
                    key={author.key}
                    href={getCreatorHref(author.name)}
                    className="rounded-[4px] border border-[#2C2C2C] bg-[#161616] p-3 hover:border-[#4C74D6] transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs mal-link truncate">
                        {author.name}
                      </span>
                      <span className="text-[11px] text-[#9B9B9B] tabular-nums shrink-0">
                        {author.workCount} works
                      </span>
                    </div>
                    {author.topWork && (
                      <p className="text-[11px] text-[#9B9B9B] truncate">
                        Notable: {author.topWork}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            ) : !searching ? (
              <p className="text-xs text-[#9B9B9B]">
                No matching Open Library author records for &ldquo;{search}&rdquo;.
              </p>
            ) : null}
          </section>
        )}

        {/* Featured Curated Writers & Artists */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#2E2E2E] pb-1">
            <h2 className="text-sm font-bold text-white">
              Featured Graphic Novel Writers &amp; Artists ({filteredCurated.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCurated.map((creator) => {
              const lead = creator.curatedWorks[0];
              return (
                <Link
                  key={creator.name}
                  href={getCreatorHref(creator.name)}
                  className="flex gap-3 rounded-[4px] border border-[#2C2C2C] bg-[#161616] p-3 hover:border-[#4C74D6] transition-colors"
                >
                  <div className="w-12 h-17 shrink-0 rounded-[3px] border border-[#333333] bg-[#222222] overflow-hidden">
                    {lead?.coverUrl && (
                      <img
                        src={lead.coverUrl}
                        alt={lead.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold mal-link truncate">
                        {creator.name}
                      </span>
                      <span className="text-[10px] rounded-[3px] border border-[#333333] bg-[#202020] px-1.5 py-0.5 text-[#CCCCCC] shrink-0">
                        {creator.roles.join(" & ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#CCCCCC] truncate">
                      {creator.curatedWorks.map((w) => w.title).join(", ")}
                    </p>
                    <p className="text-[11px] text-[#8A8A8A]">
                      {creator.curatedWorks.length} curated · View full bibliography →
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function CreatorProfileView({ creatorName }: { creatorName: string }) {
  const { state, getEntry, setStatus } = useGNovel();

  const curatedWorks = useMemo(() => {
    const q = creatorName.toLowerCase();
    return CURATED_NOVELS.filter(
      (n) =>
        n.writers.some((w) => w.toLowerCase() === q) ||
        n.artists.some((a) => a.toLowerCase() === q)
    ).sort((a, b) => b.communityScore - a.communityScore);
  }, [creatorName]);

  const knownRoles = useMemo(() => {
    const roles: ("Writer" | "Artist")[] = [];
    const q = creatorName.toLowerCase();
    if (curatedWorks.some((w) => w.writers.some((n) => n.toLowerCase() === q))) {
      roles.push("Writer");
    }
    if (curatedWorks.some((w) => w.artists.some((n) => n.toLowerCase() === q))) {
      roles.push("Artist");
    }
    if (roles.length === 0) roles.push("Writer");
    return roles;
  }, [creatorName, curatedWorks]);

  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [works, setWorks] = useState<GraphicNovel[]>([]);
  const [totalWorksFound, setTotalWorksFound] = useState(0);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [comicsOnly, setComicsOnly] = useState(true);
  const [sortBy, setSortBy] = useState<CatalogSortMode>("score");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);
  const [logNovel, setLogNovel] = useState<GraphicNovel | null>(null);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      setLoadingProfile(true);
      const data = await fetchCreatorProfile(creatorName, knownRoles);
      if (active) {
        setProfile(data);
        setLoadingProfile(false);
      }
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, [creatorName, knownRoles]);

  useEffect(() => {
    if (loadingProfile) return;
    const controller = new AbortController();

    async function loadWorks() {
      setLoadingWorks(true);
      try {
        const res = await fetchCreatorWorks({
          authorKey: profile?.olKey,
          authorName: profile?.name || creatorName,
          comicsOnly,
          sort: sortBy,
          page,
          perPage: 48,
          signal: controller.signal,
        });
        // If comicsOnly yielded 0 on page 1, automatically show all author works
        if (comicsOnly && page === 1 && res.items.length === 0) {
          setComicsOnly(false);
          return;
        }
        setWorks(res.items);
        setTotalWorksFound(res.totalFound);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setWorks([]);
        }
      } finally {
        setLoadingWorks(false);
      }
    }

    loadWorks();
    return () => {
      controller.abort();
    };
  }, [
    loadingProfile,
    profile?.olKey,
    profile?.name,
    creatorName,
    comicsOnly,
    sortBy,
    page,
  ]);

  const combinedWorks = useMemo(() => {
    const base = page === 1 ? [...curatedWorks, ...works] : [...works];
    return consolidateWorks(base);
  }, [page, curatedWorks, works]);

  const userCreatorStats = useMemo(() => {
    const q = creatorName.toLowerCase();
    const matchingEntries = Object.values(state.library).filter(
      ({ novel }) =>
        novel.writers.some((w) => w.toLowerCase() === q) ||
        novel.artists.some((a) => a.toLowerCase() === q)
    );
    const rated = matchingEntries.filter((e) => e.rating > 0);
    const avg = rated.length
      ? (rated.reduce((sum, e) => sum + e.rating, 0) / rated.length).toFixed(2)
      : "—";
    return {
      tracked: matchingEntries.length,
      completed: matchingEntries.filter((e) => e.status === "completed").length,
      avgScore: avg,
    };
  }, [creatorName, state.library]);

  const perPage = 48;
  const totalPages = Math.max(1, Math.ceil(totalWorksFound / perPage));
  const initials = creatorName
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");

  return (
    <>
      <div className="mx-auto max-w-[1080px] border-x border-b border-[#2A2A2A] bg-[#121212]">
        {/* MAL Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E2E2E] bg-[#222222] px-4 py-2.5">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">
              {profile?.name || creatorName}
            </h1>
            <p className="text-xs text-[#9B9B9B]">
              {(profile?.roles || knownRoles).join(" & ")} Profile
            </p>
          </div>
          <Link href="/creator/" className="text-xs mal-link">
            ← All Creators
          </Link>
        </div>

        {/* MAL 2-Column Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
          {/* LEFT SIDEBAR */}
          <aside className="border-b md:border-b-0 md:border-r border-[#2A2A2A] p-3 space-y-4 text-xs">
            {/* Portrait */}
            <div className="mx-auto max-w-[210px] md:max-w-none aspect-[3/4] overflow-hidden rounded-[4px] border border-[#303030] bg-[#1A1A1A] flex items-center justify-center">
              {profile?.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 p-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2E51A2]/30 border border-[#4C74D6]/40 text-lg font-bold text-[#8EB4FF]">
                    {initials || <User className="h-7 w-7" />}
                  </div>
                  <span className="text-[11px] text-[#9B9B9B]">
                    {creatorName}
                  </span>
                </div>
              )}
            </div>

            {/* Creator Information */}
            <div className="space-y-1.5">
              <h2 className="border-b border-[#2E2E2E] pb-1 font-bold text-[#E5E5E5]">
                Information
              </h2>
              <dl className="space-y-1.5 text-[11px]">
                <div>
                  <dt className="inline text-[#9B9B9B]">Roles: </dt>
                  <dd className="inline text-[#8EB4FF]">
                    {(profile?.roles || knownRoles).join(", ")}
                  </dd>
                </div>
                {profile?.birthDate && (
                  <div>
                    <dt className="inline text-[#9B9B9B]">Born: </dt>
                    <dd className="inline text-[#E5E5E5]">{profile.birthDate}</dd>
                  </div>
                )}
                {profile?.deathDate && (
                  <div>
                    <dt className="inline text-[#9B9B9B]">Died: </dt>
                    <dd className="inline text-[#E5E5E5]">{profile.deathDate}</dd>
                  </div>
                )}
                {profile?.workCount !== undefined && (
                  <div>
                    <dt className="inline text-[#9B9B9B]">Archived Works: </dt>
                    <dd className="inline text-[#E5E5E5] tabular-nums">
                      {profile.workCount.toLocaleString()}
                    </dd>
                  </div>
                )}
                {profile?.alternateNames && profile.alternateNames.length > 0 && (
                  <div>
                    <dt className="inline text-[#9B9B9B]">Also Known As: </dt>
                    <dd className="inline text-[#CCCCCC]">
                      {profile.alternateNames.slice(0, 3).join(", ")}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* User Shelf Stats for this Creator */}
            <div className="space-y-1.5">
              <h2 className="border-b border-[#2E2E2E] pb-1 font-bold text-[#E5E5E5]">
                Your Reading Stats
              </h2>
              <dl className="space-y-1.5 text-[11px]">
                <div>
                  <dt className="inline text-[#9B9B9B]">On Your Shelf: </dt>
                  <dd className="inline text-white font-semibold tabular-nums">
                    {userCreatorStats.tracked}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-[#9B9B9B]">Completed: </dt>
                  <dd className="inline text-[#4ADE80] tabular-nums">
                    {userCreatorStats.completed}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-[#9B9B9B]">Your Avg Score: </dt>
                  <dd className="inline text-[#FACC15] font-semibold tabular-nums">
                    {userCreatorStats.avgScore}
                  </dd>
                </div>
              </dl>
            </div>

            {/* External Links */}
            {(profile?.olKey || profile?.wikipediaUrl || (profile?.links?.length ?? 0) > 0) && (
              <div className="space-y-1.5 pt-2 border-t border-[#2A2A2A] text-[11px]">
                <h2 className="font-bold text-[#E5E5E5]">External Links</h2>
                <div className="flex flex-col gap-1">
                  {profile?.olKey && (
                    <a
                      href={`https://openlibrary.org/authors/${profile.olKey}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 mal-link"
                    >
                      Open Library Author Page
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {profile?.wikipediaUrl && (
                    <a
                      href={profile.wikipediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 mal-link"
                    >
                      Wikipedia Biography
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {profile?.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 mal-link truncate"
                    >
                      {link.title}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* RIGHT MAIN COLUMN */}
          <div className="p-3 sm:p-4 space-y-5 min-w-0">
            {/* Breadcrumb */}
            <div className="text-[11px] text-[#9B9B9B] flex flex-wrap items-center gap-1">
              <Link href="/" className="mal-link">
                Top
              </Link>
              <span>&gt;</span>
              <Link href="/creator/" className="mal-link">
                Creators
              </Link>
              <span>&gt;</span>
              <span className="text-[#E5E5E5]">{profile?.name || creatorName}</span>
            </div>

            {/* Biography */}
            <section className="space-y-2">
              <h2 className="border-b border-[#2E2E2E] pb-1 text-sm font-bold text-white">
                Biography
              </h2>
              {loadingProfile ? (
                <Skeleton className="h-20 w-full rounded-[4px] bg-[#1C1C1C]" />
              ) : profile?.bio ? (
                <p className="text-xs sm:text-sm text-[#CCCCCC] leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-xs text-[#9B9B9B]">
                  No biography has been added for {creatorName} yet. Browse their
                  published works and credits below.
                </p>
              )}

              {profile?.topSubjects && profile.topSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profile.topSubjects.map((sub) => (
                    <span
                      key={sub}
                      className="rounded-[3px] border border-[#2C2C2C] bg-[#181818] px-2 py-0.5 text-[11px] text-[#9B9B9B]"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Full Works / Bibliography */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E2E2E] pb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#8EB4FF]" />
                  <h2 className="text-sm font-bold text-white">
                    Published Works &amp; Credits
                  </h2>
                  <span className="text-xs text-[#9B9B9B] tabular-nums">
                    ({Math.max(combinedWorks.length, totalWorksFound).toLocaleString()} total)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setComicsOnly(!comicsOnly);
                      setPage(1);
                    }}
                    className={cn(
                      "rounded-[3px] border px-2.5 py-1 text-[11px] transition-colors",
                      comicsOnly
                        ? "bg-[#2E51A2] border-[#4C74D6] text-white font-semibold"
                        : "bg-[#181818] border-[#333333] text-[#CCCCCC] hover:text-white"
                    )}
                  >
                    {comicsOnly ? "Comics & GNs Only" : "Showing All Bibliography"}
                  </button>

                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as CatalogSortMode);
                      setPage(1);
                    }}
                    aria-label="Sort creator works"
                    className="h-7 rounded-[3px] border border-[#333333] bg-[#141414] px-2 text-xs text-white"
                  >
                    <option value="score">Top Rated</option>
                    <option value="popularity">Most Popular</option>
                    <option value="newest">Newest</option>
                  </select>

                  <div className="inline-flex border border-[#333333] bg-[#141414] p-0.5 rounded-[3px]">
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={cn(
                        "p-1 rounded-[2px]",
                        viewMode === "table"
                          ? "bg-[#2E51A2] text-white"
                          : "text-[#9B9B9B]"
                      )}
                      aria-label="Table view"
                    >
                      <ListIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-1 rounded-[2px]",
                        viewMode === "grid"
                          ? "bg-[#2E51A2] text-white"
                          : "text-[#9B9B9B]"
                      )}
                      aria-label="Cover view"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {loadingWorks && combinedWorks.length === 0 ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-16 w-full rounded-[4px] bg-[#1C1C1C]"
                    />
                  ))}
                </div>
              ) : combinedWorks.length === 0 ? (
                <div className="rounded-[4px] border border-[#2C2C2C] bg-[#161616] p-6 text-center text-xs text-[#9B9B9B]">
                  No graphic novel editions returned for this query. Try toggling{" "}
                  <button
                    type="button"
                    onClick={() => setComicsOnly(false)}
                    className="mal-link"
                  >
                    Show All Bibliography
                  </button>
                  .
                </div>
              ) : viewMode === "table" ? (
                <div className="overflow-x-auto rounded-[4px] border border-[#2C2C2C]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#2E51A2] text-white text-[11px] font-bold">
                        <th className="py-2 px-3">Work</th>
                        <th className="py-2 px-3 w-20 text-center">Year</th>
                        <th className="py-2 px-3 w-20 text-center">Score</th>
                        <th className="py-2 px-3 w-32 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#252525] bg-[#141414]">
                      {combinedWorks.map((work) => {
                        const entry = getEntry(work.id);
                        const statusMeta = entry?.status
                          ? getStatusMeta(entry.status)
                          : undefined;
                        const href = getNovelHref(work);
                        const isWriter = work.writers.some(
                          (w) => w.toLowerCase() === creatorName.toLowerCase()
                        );
                        const isArtist = work.artists.some(
                          (a) => a.toLowerCase() === creatorName.toLowerCase()
                        );
                        const roleText =
                          isWriter && isArtist
                            ? "Writer & Artist"
                            : isArtist
                            ? "Artist"
                            : "Writer";

                        return (
                          <tr
                            key={work.id}
                            className="hover:bg-[#1B1B1B] transition-colors"
                          >
                            <td className="py-2 px-3">
                              <div className="flex gap-2.5">
                                <Link
                                  href={href}
                                  onClick={() => cacheNovelSnapshot(work)}
                                  className="w-10 h-14 shrink-0 rounded-[3px] border border-[#333333] bg-[#222222] overflow-hidden"
                                >
                                  {work.coverUrl && (
                                    <img
                                      src={work.coverUrl}
                                      alt={work.title}
                                      loading="lazy"
                                      className="h-full w-full object-cover"
                                    />
                                  )}
                                </Link>
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Link
                                      href={href}
                                      onClick={() => cacheNovelSnapshot(work)}
                                      className="font-bold mal-link"
                                    >
                                      {work.title}
                                    </Link>
                                    <span className="rounded-[2px] border border-[#2F2F2F] bg-[#1C1C1C] px-1.5 py-0.2 text-[10px] text-[#9B9B9B]">
                                      {roleText}
                                    </span>
                                    {(work.consolidatedEditions?.length ?? 0) > 1 && (
                                      <span
                                        title={`${work.consolidatedEditions!.length} collected editions / volumes merged into this series entry`}
                                        className="rounded-[2px] border border-[#2E51A2]/50 bg-[#2E51A2]/15 px-1.5 py-0.2 text-[10px] text-[#9EB7F5]"
                                      >
                                        {work.consolidatedEditions!.length} vols/editions grouped
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[#9B9B9B] truncate">
                                    {work.format} · {work.publisher}
                                  </p>
                                  <p className="text-[11px] text-[#7F7F7F] truncate">
                                    With{" "}
                                    <CreatorLinks
                                      names={Array.from(
                                        new Set([...work.writers, ...work.artists])
                                      )}
                                      max={3}
                                    />
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-2 px-3 text-center text-[#CCCCCC] tabular-nums">
                              {work.year || "—"}
                            </td>

                            <td className="py-2 px-3 text-center">
                              <span className="inline-flex items-center gap-1 font-semibold text-[#FACC15] tabular-nums">
                                <Star className="h-3 w-3 fill-[#FACC15] text-[#FACC15]" />
                                {work.communityScore.toFixed(2)}
                              </span>
                            </td>

                            <td className="py-2 px-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <select
                                  value={entry?.status || "none"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "none") {
                                      if (entry?.status && entry.status !== "none") {
                                        setStatus(work, entry.status);
                                      }
                                    } else {
                                      const target = val as Exclude<
                                        ReadingStatus,
                                        "none"
                                      >;
                                      if (entry?.status !== target) {
                                        setStatus(work, target);
                                      }
                                    }
                                  }}
                                  aria-label={`Set status for ${work.title}`}
                                  className={cn(
                                    "h-7 w-26 rounded-[3px] border px-1.5 text-[11px] font-semibold focus:outline-none",
                                    statusMeta
                                      ? statusMeta.badgeClass
                                      : "border-[#3A3A3A] bg-[#222222] text-[#E5E5E5]"
                                  )}
                                >
                                  <option value="none" className="bg-[#181818] text-white">
                                    + Shelf
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
                                  onClick={() => setLogNovel(work)}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {combinedWorks.map((work) => (
                    <NovelCard
                      key={work.id}
                      novel={work}
                      onLogClick={(n) => setLogNovel(n)}
                    />
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex justify-center pt-2">
                  <div className="inline-flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 rounded-[3px] border border-[#333333] bg-[#1C1C1C] px-2.5 py-1 text-[#CCCCCC] hover:bg-[#2E51A2] hover:text-white disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Prev 48
                    </button>
                    <span className="px-2.5 text-[#9B9B9B] tabular-nums">
                      Page <strong className="text-white">{page}</strong> of{" "}
                      {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="inline-flex items-center gap-1 rounded-[3px] border border-[#333333] bg-[#1C1C1C] px-2.5 py-1 text-[#CCCCCC] hover:bg-[#2E51A2] hover:text-white disabled:opacity-40"
                    >
                      Next 48
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <LogModal
        open={Boolean(logNovel)}
        onClose={() => setLogNovel(null)}
        initialNovel={logNovel}
      />
    </>
  );
}

export default function CreatorPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1080px] border-x border-[#2A2A2A] bg-[#121212] p-6">
          <Skeleton className="h-96 w-full rounded-[4px] bg-[#1C1C1C]" />
        </div>
      }
    >
      <CreatorPageClient />
    </Suspense>
  );
}
