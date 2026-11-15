import type {
  CreatorProfile,
  GraphicNovel,
  NovelFormat,
  OpenLibraryEnrichment,
} from "./types";

interface OLSearchDoc {
  key: string;
  title: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
  publisher?: string[];
  number_of_pages_median?: number;
  edition_count?: number;
  ratings_average?: number;
  ratings_count?: number;
  readinglog_count?: number;
}

interface OLWorkDetail {
  key: string;
  title?: string;
  description?: string | { value: string };
  subjects?: string[];
  covers?: number[];
  first_publish_date?: string;
}

interface OLEditionDoc {
  key: string;
  title?: string;
  publishers?: string[];
  publish_date?: string;
  number_of_pages?: number;
  physical_format?: string;
}

const CACHE_KEY = "gnovel:ol-cache:v2";

function isMangaLike(subjects: string[] = [], title = ""): boolean {
  const joined = `${subjects.join(" ")} ${title}`.toLowerCase();
  return (
    /\bmanga\b/.test(joined) ||
    /\bmanhwa\b/.test(joined) ||
    /\bmanhua\b/.test(joined) ||
    /\bshonen\b/.test(joined) ||
    /\bseinen\b/.test(joined) ||
    /\bshojo\b/.test(joined)
  );
}

function inferFormat(subjects: string[] = [], title = ""): NovelFormat {
  const joined = `${subjects.join(" ")} ${title}`.toLowerCase();
  if (joined.includes("omnibus")) return "Omnibus";
  if (joined.includes("vol.") || joined.includes("volume")) return "Series";
  return "Graphic Novel";
}

function cleanGenres(subjects: string[] = []): string[] {
  const mapped: string[] = [];
  const lower = subjects.map((s) => s.toLowerCase());
  const rules: [string, string[]][] = [
    ["Sci-Fi", ["science fiction", "sci-fi", "cyberpunk", "space", "dystopia"]],
    ["Dark Fantasy", ["fantasy", "magic", "mythology", "supernatural"]],
    ["Horror", ["horror", "vampire", "zombie", "occult", "gothic"]],
    ["Noir & Crime", ["crime", "mystery", "detective", "noir", "thriller"]],
    ["Superhero", ["superhero", "batman", "superman", "spider-man", "x-men", "avengers"]],
    ["Memoir & History", ["biography", "memoir", "autobiography", "history", "historical"]],
    ["Slice of Life", ["coming of age", "slice of life", "teen", "drama", "romance"]],
  ];
  for (const [label, keywords] of rules) {
    if (lower.some((s) => keywords.some((k) => s.includes(k)))) {
      mapped.push(label);
    }
  }
  if (mapped.length === 0) mapped.push("Comics & Graphic Novels");
  return mapped.slice(0, 3);
}

export function getCreatorHref(name: string): string {
  return `/creator/?name=${encodeURIComponent(name)}`;
}

function normalizeWords(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractCanonicalSeriesTitle(
  title: string,
  writers: string[] = [],
  artists: string[] = []
): string {
  let clean = title
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .trim();

  // Strip trailing edition, volume, book, compendium, omnibus, hardcover suffixes
  const trailingPatterns = [
    /[,:\-–—\s]+(?:the\s+)?(?:complete|absolute|deluxe|ultimate|definitive|collector'?s|annotated|anniversary|illustrated|integral|int[eé]grale|library|archive)\s*(?:edition|omnibus|compendium|collection|hardcover|paperback|tpb|box\s*set).*$/i,
    /[,:\-–—\s]+(?:tpb|omnibus|compendium|hardcover|paperback|deluxe\s*edition|absolute\s*edition).*$/i,
    /[,:\-–—\s]+(?:vol(?:ume)?s?\.?|book|bk\.?|part|pt\.?|tome|band|issues?|nos?\.?|#)\s*(?:\d+(?:\s*[-–]\s*\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|[ivxlcdm]+)\b.*$/i,
    /[\s:,-]+(?:i|ii|iii|iv|v|vi|vii|viii|ix|x|\d+)$/i,
  ];

  let prev = "";
  while (prev !== clean) {
    prev = clean;
    for (const pat of trailingPatterns) {
      clean = clean.replace(pat, "").trim();
    }
    clean = clean.replace(/[,:\-–—]+$/g, "").trim();
  }

  clean = clean.replace(
    /^(?:the\s+)?(?:complete|indispensable|essential|authoritative|best\s+of|absolute|deluxe|ultimate|omnibus)\s+/i,
    ""
  );
  clean = clean.replace(/^(?:the|a|an)\s+/i, "").trim();

  const normalized = normalizeWords(clean)
    .replace(/\bseason eight\b/g, "season 8")
    .replace(/\bseason one\b/g, "season 1");
  const creatorsJoined = [...writers, ...artists].join(" ").toLowerCase();

  // Known Open Library split-title aliases scoped to their exact creators
  if (
    (creatorsJoined.includes("vaughan") || creatorsJoined.includes("pia guerra") || creatorsJoined.includes("marzan")) &&
    (normalized === "y" || normalized === "last man" || normalized.startsWith("y last man") || normalized.startsWith("y the last man"))
  ) {
    return "y last man";
  }
  if (
    creatorsJoined.includes("gaiman") &&
    ["sandman", "season of mists", "preludes and nocturnes", "dolls house", "brief lives", "fables and reflections", "game of you", "kindly ones", "wake", "overture", "dream country", "worlds end"].includes(normalized)
  ) {
    return "sandman";
  }

  return normalized || normalizeWords(title);
}

function getSeriesPrefixCandidate(title: string): string | null {
  const idx = title.search(/[:\-–—]/);
  if (idx <= 1) return null;
  const prefix = title.slice(0, idx).trim();
  const norm = normalizeWords(prefix.replace(/^(?:the|a|an)\s+/i, ""));
  return norm.length >= 3 ? norm : null;
}

function creatorsOverlap(a: GraphicNovel, b: GraphicNovel): boolean {
  const setA = new Set(
    [...a.writers, ...a.artists].map((x) => normalizeWords(x))
  );
  for (const person of [...b.writers, ...b.artists]) {
    if (setA.has(normalizeWords(person))) return true;
  }
  return false;
}

function pickPrimaryNovel(a: GraphicNovel, b: GraphicNovel): [GraphicNovel, GraphicNovel] {
  if (a.isCurated && !b.isCurated) return [a, b];
  if (b.isCurated && !a.isCurated) return [b, a];

  const scoreA =
    (a.coverUrl ? 100 : 0) +
    Math.min(a.title.length * -1, 0) +
    (a.membersCount || 0) * 0.01 +
    (a.ratingsCount || 0);
  const scoreB =
    (b.coverUrl ? 100 : 0) +
    Math.min(b.title.length * -1, 0) +
    (b.membersCount || 0) * 0.01 +
    (b.ratingsCount || 0);

  return scoreA >= scoreB ? [a, b] : [b, a];
}

/**
 * Consolidates multiple editions, volumes, compendiums, and hardcover reprints
 * of the same series into a single canonical entry with `consolidatedEditions` attached.
 */
export function consolidateWorks(items: GraphicNovel[]): GraphicNovel[] {
  const groups: {
    key: string;
    primary: GraphicNovel;
    editions: GraphicNovel[];
  }[] = [];

  for (const item of items) {
    const key = extractCanonicalSeriesTitle(item.title, item.writers, item.artists);
    const prefix = getSeriesPrefixCandidate(item.title);

    let match = groups.find((g) => {
      if (g.key === key && (creatorsOverlap(g.primary, item) || g.primary.title.toLowerCase() === item.title.toLowerCase() || key.length >= 6)) {
        return true;
      }
      if (prefix && (g.key === prefix || extractCanonicalSeriesTitle(g.primary.title, g.primary.writers, g.primary.artists) === prefix) && creatorsOverlap(g.primary, item)) {
        return true;
      }
      return false;
    });

    if (!match && key.includes(" ")) {
      // Also check if an existing group's prefix matches this item's key (e.g. "Hellboy: Seed of Destruction" matched before "Hellboy")
      match = groups.find((g) => {
        const gPrefix = getSeriesPrefixCandidate(g.primary.title);
        return Boolean(gPrefix && gPrefix === key && creatorsOverlap(g.primary, item));
      });
    }

    if (!match) {
      groups.push({
        key,
        primary: item,
        editions: [item],
      });
    } else {
      const [winner, runnerUp] = pickPrimaryNovel(match.primary, item);
      if (winner === item) {
        match.key = extractCanonicalSeriesTitle(winner.title, winner.writers, winner.artists);
      }
      match.primary = winner;
      if (!match.editions.some((e) => e.id === runnerUp.id && e.title === runnerUp.title)) {
        match.editions.push(item);
      }
    }
  }

  return groups.map((g) => {
    if (g.editions.length <= 1) {
      return g.primary;
    }

    const seenEdKeys = new Set<string>();
    const rawEditions: NonNullable<GraphicNovel["consolidatedEditions"]> = [];
    for (const ed of g.editions) {
      if (ed.consolidatedEditions?.length) {
        rawEditions.push(...ed.consolidatedEditions);
      } else {
        rawEditions.push({
          id: ed.id,
          olKey: ed.olKey,
          title: ed.title,
          year: ed.year || undefined,
          publisher: ed.publisher,
          coverUrl: ed.coverUrl,
          score: ed.communityScore,
        });
      }
    }

    const consolidatedEditions = rawEditions.filter((ed) => {
      const k = `${ed.olKey || ed.id}::${ed.title.toLowerCase()}`;
      if (seenEdKeys.has(k)) return false;
      seenEdKeys.add(k);
      return true;
    });

    const merged: GraphicNovel = {
      ...g.primary,
      membersCount: Math.max(
        g.primary.membersCount || 0,
        ...g.editions.map((e) => e.membersCount || 0)
      ),
      consolidatedEditions,
    };
    cacheNovelSnapshot(merged);
    return merged;
  });
}

export function extractOlId(key: string): string {
  return key.replace("/works/", "").replace(/[^A-Za-z0-9_-]/g, "");
}

export function cacheNovelSnapshot(novel: GraphicNovel) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const map: Record<string, GraphicNovel> = raw ? JSON.parse(raw) : {};
    map[novel.id] = novel;
    const keys = Object.keys(map);
    if (keys.length > 80) {
      delete map[keys[0]];
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota errors
  }
}

export function getCachedNovel(id: string): GraphicNovel | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const map: Record<string, GraphicNovel> = JSON.parse(raw);
    return map[id];
  } catch {
    return undefined;
  }
}

export interface CatalogBrowseResult {
  items: GraphicNovel[];
  totalFound: number;
  page: number;
  perPage: number;
}

export type OpenLibraryCategory =
  | "all"
  | "superhero"
  | "scifi"
  | "horror"
  | "noir"
  | "memoir";

export type CatalogSortMode = "score" | "popularity" | "newest";

function mapOlDocToNovel(doc: OLSearchDoc, rankHint?: number): GraphicNovel {
  const olId = extractOlId(doc.key);
  const writers = doc.author_name?.slice(0, 2) || ["Unknown Creator"];
  const score10 = doc.ratings_average
    ? Number(Math.min(9.9, Math.max(4.5, doc.ratings_average * 2)).toFixed(2))
    : 7.85;
  const members =
    doc.readinglog_count ||
    Math.max((doc.edition_count || 1) * 180, (doc.ratings_count || 5) * 12);

  const novel: GraphicNovel = {
    id: `ol-${olId}`,
    olKey: olId,
    sourceLabel: "Open Library",
    title: doc.title,
    subtitle: doc.subtitle,
    writers,
    artists: writers,
    publisher: doc.publisher?.[0] || "Independent / Archive",
    year: doc.first_publish_year || 0,
    publicationStatus: "Finished",
    pages: doc.number_of_pages_median,
    format: inferFormat(doc.subject, doc.title),
    genres: cleanGenres(doc.subject),
    deck:
      doc.subtitle ||
      `Archived graphic novel work (${doc.edition_count || 1} known editions on Open Library).`,
    synopsis:
      "Loaded from the Open Library community archive. Open this entry to view live community ratings, published editions, and synopsis.",
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : "",
    communityScore: score10,
    ratingsCount: doc.ratings_count || (doc.edition_count || 1) * 24,
    membersCount: members,
    ranked: rankHint,
    isCurated: false,
  };
  cacheNovelSnapshot(novel);
  return novel;
}

export async function browseOpenLibraryCatalog({
  category = "all",
  sort = "score",
  page = 1,
  perPage = 48,
  signal,
}: {
  category?: OpenLibraryCategory;
  sort?: CatalogSortMode;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}): Promise<CatalogBrowseResult> {
  const exclusions =
    'NOT subject:"Manga" NOT subject:"Shonen" NOT subject:"Seinen" NOT subject:"Shojo" NOT subject:"Manhwa" NOT subject:"Manhua" NOT publisher:"Viz Media" NOT publisher:"Kodansha" NOT publisher:"Shueisha" NOT subject:"Drama" NOT subject:"Plays" NOT subject:"Classic Literature" NOT subject:"Study guides" NOT subject:"Criticism and interpretation" NOT author:"Jeff Kinney" NOT subject:"Wimpy Kid" NOT subject:"Juvenile literature"';

  const categoryClauses: Record<OpenLibraryCategory, string> = {
    all: '(subject:"Graphic novels" OR subject:"Comic books, strips, etc.")',
    superhero: '(subject:"Superheroes" AND (subject:"Comic books, strips, etc." OR subject:"Graphic novels"))',
    scifi: '((subject:"Science fiction comic books, strips, etc." OR (subject:"Graphic novels" AND subject:"Science fiction")))',
    horror: '((subject:"Horror comic books, strips, etc." OR (subject:"Graphic novels" AND subject:"Horror")))',
    noir: '((subject:"Graphic novels" AND (subject:"Mystery" OR subject:"Crime" OR subject:"Detective")))',
    memoir: '((subject:"Graphic novels" AND (subject:"Biography" OR subject:"Memoir" OR subject:"History")))',
  };

  const sortParam =
    sort === "popularity"
      ? "readinglog"
      : sort === "newest"
      ? "new"
      : "rating";

  const rawLimit = Math.min(100, perPage * 2);
  const q = `${categoryClauses[category]} ${exclusions}`;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(
    q
  )}&sort=${sortParam}&limit=${rawLimit}&page=${page}&fields=key,title,subtitle,author_name,first_publish_year,cover_i,subject,publisher,number_of_pages_median,edition_count,ratings_average,ratings_count,readinglog_count`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Open Library browse failed");
  const data = await res.json();
  const docs: OLSearchDoc[] = data.docs || [];

  const rawItems = docs
    .filter((d) => d.key && d.title && d.cover_i && !isMangaLike(d.subject, d.title))
    .map((doc, idx) => mapOlDocToNovel(doc, (page - 1) * perPage + idx + 1));

  const items = consolidateWorks(rawItems).slice(0, perPage);

  return {
    items,
    totalFound: data.numFound || items.length,
    page,
    perPage,
  };
}

export async function searchOpenLibrary(
  query: string,
  comicsOnly = true,
  signal?: AbortSignal
): Promise<GraphicNovel[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const q = comicsOnly
    ? `${trimmed} (subject:"Comic books, strips, etc." OR subject:"Graphic novels") NOT subject:"Manga" NOT subject:"Manhwa" NOT publisher:"Viz Media" NOT publisher:"Kodansha" NOT publisher:"Shueisha"`
    : `${trimmed} NOT subject:"Manga" NOT subject:"Manhwa" NOT publisher:"Viz Media" NOT publisher:"Kodansha" NOT publisher:"Shueisha"`;

  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(
    q
  )}&limit=45&fields=key,title,subtitle,author_name,first_publish_year,cover_i,subject,publisher,number_of_pages_median,edition_count,ratings_average,ratings_count,readinglog_count`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Open Library search failed");
  const data = await res.json();
  const docs: OLSearchDoc[] = data.docs || [];

  if (comicsOnly && docs.length === 0) {
    return searchOpenLibrary(trimmed, false, signal);
  }

  const rawItems = docs
    .filter((d) => d.key && d.title && d.cover_i && !isMangaLike(d.subject, d.title))
    .map((doc) => mapOlDocToNovel(doc));

  return consolidateWorks(rawItems).slice(0, 24);
}

interface OLAuthorSearchDoc {
  key?: string;
  name?: string;
  birth_date?: string;
  death_date?: string;
  top_work?: string;
  work_count?: number;
  top_subjects?: string[];
}

interface OLAuthorDetail {
  key?: string;
  name?: string;
  personal_name?: string;
  birth_date?: string;
  death_date?: string;
  alternate_names?: string[];
  photos?: number[];
  bio?: string | { value?: string };
  links?: { title?: string; url?: string }[];
}

export async function fetchCreatorProfile(
  name: string,
  knownRoles: ("Writer" | "Artist")[] = []
): Promise<CreatorProfile> {
  const trimmed = name.trim();
  const profile: CreatorProfile = {
    name: trimmed,
    links: [],
    roles: knownRoles,
  };

  try {
    const searchRes = await fetch(
      `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(trimmed)}&limit=5`
    );
    let authorKey: string | undefined;
    let searchDoc: OLAuthorSearchDoc | undefined;

    if (searchRes.ok) {
      const sData = await searchRes.json();
      const docs: OLAuthorSearchDoc[] = sData.docs || [];
      searchDoc =
        docs.find(
          (d) => (d.name || "").toLowerCase() === trimmed.toLowerCase()
        ) || docs[0];
      authorKey = searchDoc?.key;
      if (searchDoc) {
        profile.olKey = searchDoc.key;
        profile.name = searchDoc.name || trimmed;
        profile.birthDate = searchDoc.birth_date;
        profile.deathDate = searchDoc.death_date;
        profile.workCount = searchDoc.work_count;
        profile.topSubjects = searchDoc.top_subjects
          ?.filter((s) => !/manga|shonen|seinen|shojo/i.test(s))
          .slice(0, 6);
      }
    }

    const [detailRes, wikiRes] = await Promise.allSettled([
      authorKey
        ? fetch(`https://openlibrary.org/authors/${authorKey}.json`)
        : Promise.resolve(null),
      fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
          trimmed.replace(/\s+/g, "_")
        )}`
      ),
    ]);

    if (
      detailRes.status === "fulfilled" &&
      detailRes.value &&
      detailRes.value.ok
    ) {
      const detail: OLAuthorDetail = await detailRes.value.json();
      profile.birthDate = detail.birth_date || profile.birthDate;
      profile.deathDate = detail.death_date || profile.deathDate;
      profile.alternateNames = detail.alternate_names?.slice(0, 6);

      const rawBio =
        typeof detail.bio === "string" ? detail.bio : detail.bio?.value || "";
      const cleanBio = rawBio
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/----------[\s\S]*$/m, "")
        .trim();
      if (cleanBio) {
        profile.bio = cleanBio;
      }

      const photoId = detail.photos?.find((p) => p > 0);
      if (photoId) {
        profile.photoUrl = `https://covers.openlibrary.org/a/id/${photoId}-L.jpg`;
      }

      if (detail.links?.length) {
        profile.links = detail.links
          .filter((l): l is { title?: string; url: string } => Boolean(l.url))
          .slice(0, 5)
          .map((l) => ({
            title: l.title || "External Link",
            url: l.url,
          }));
      }
    }

    if (wikiRes.status === "fulfilled" && wikiRes.value.ok) {
      const wiki = await wikiRes.value.json();
      if (wiki?.type === "standard") {
        if (!profile.photoUrl && wiki.thumbnail?.source) {
          profile.photoUrl = wiki.thumbnail.source;
        }
        if (
          wiki.extract &&
          (!profile.bio || profile.bio.length < 80)
        ) {
          profile.bio = wiki.extract;
        }
        if (wiki.content_urls?.desktop?.page) {
          profile.wikipediaUrl = wiki.content_urls.desktop.page;
        }
      }
    }
  } catch {
    // Keep base profile safely on network fallback
  }

  return profile;
}

export async function fetchCreatorWorks({
  authorKey,
  authorName,
  comicsOnly = true,
  sort = "score",
  page = 1,
  perPage = 48,
  signal,
}: {
  authorKey?: string;
  authorName: string;
  comicsOnly?: boolean;
  sort?: CatalogSortMode;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}): Promise<CatalogBrowseResult> {
  const baseQuery = authorKey
    ? `author_key:${authorKey}`
    : `author:"${authorName.replace(/"/g, "")}"`;
  const scopeClause = comicsOnly
    ? ' AND (subject:"Comic books, strips, etc." OR subject:"Graphic novels" OR subject:"Comics & graphic novels")'
    : "";
  const q = `${baseQuery}${scopeClause} NOT subject:"Manga" NOT subject:"Manhwa"`;

  const sortParam =
    sort === "popularity"
      ? "readinglog"
      : sort === "newest"
      ? "new"
      : "rating";

  const rawLimit = Math.min(100, perPage * 2);
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(
    q
  )}&sort=${sortParam}&limit=${rawLimit}&page=${page}&fields=key,title,subtitle,author_name,first_publish_year,cover_i,subject,publisher,number_of_pages_median,edition_count,ratings_average,ratings_count,readinglog_count`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Failed to fetch creator works");
  const data = await res.json();
  const docs: OLSearchDoc[] = data.docs || [];

  const rawItems = docs
    .filter((d) => d.key && d.title && !isMangaLike(d.subject, d.title))
    .map((doc, idx) =>
      mapOlDocToNovel(doc, (page - 1) * perPage + idx + 1)
    )
    .map((n) => ({
      ...n,
      coverUrl: n.coverUrl.includes("undefined") ? "" : n.coverUrl,
    }));

  const items = consolidateWorks(rawItems).slice(0, perPage);

  return {
    items,
    totalFound: data.numFound || items.length,
    page,
    perPage,
  };
}

export async function fetchOpenLibraryWork(
  olId: string,
  fallback?: GraphicNovel
): Promise<GraphicNovel | null> {
  const cleanId = extractOlId(olId);
  try {
    const res = await fetch(`https://openlibrary.org/works/${cleanId}.json`);
    if (!res.ok) return fallback || null;
    const data: OLWorkDetail = await res.json();
    const rawDesc =
      typeof data.description === "string"
        ? data.description
        : data.description?.value || "";
    const cleanDesc = rawDesc
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/----------[\s\S]*$/m, "")
      .trim();

    const coverId = data.covers?.find((c) => c > 0);
    const base: GraphicNovel = fallback || {
      id: `ol-${cleanId}`,
      olKey: cleanId,
      title: data.title || "Untitled Graphic Novel",
      writers: ["Open Library Contributor"],
      artists: ["Open Library Contributor"],
      publisher: "Open Library Archive",
      year: data.first_publish_date
        ? parseInt(data.first_publish_date.match(/\d{4}/)?.[0] || "0", 10)
        : 0,
      publicationStatus: "Finished",
      format: inferFormat(data.subjects, data.title),
      genres: cleanGenres(data.subjects),
      deck: cleanDesc.slice(0, 160) || "Archived graphic novel work.",
      synopsis: cleanDesc || "No synopsis available on Open Library yet.",
      coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : "",
      communityScore: 7.85,
      ratingsCount: 120,
      membersCount: 450,
      isCurated: false,
    };

    const enriched: GraphicNovel = {
      ...base,
      title: data.title || base.title,
      genres: data.subjects?.length ? cleanGenres(data.subjects) : base.genres,
      synopsis: cleanDesc || base.synopsis,
      deck: base.deck || cleanDesc.slice(0, 150),
      coverUrl:
        base.coverUrl ||
        (coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : ""),
    };

    cacheNovelSnapshot(enriched);
    return enriched;
  } catch {
    return fallback || null;
  }
}

export async function fetchOpenLibraryEnrichment(
  olId: string
): Promise<OpenLibraryEnrichment | null> {
  const cleanId = extractOlId(olId);
  try {
    const [ratingsRes, shelvesRes, editionsRes] = await Promise.allSettled([
      fetch(`https://openlibrary.org/works/${cleanId}/ratings.json`),
      fetch(`https://openlibrary.org/works/${cleanId}/bookshelves.json`),
      fetch(`https://openlibrary.org/works/${cleanId}/editions.json?limit=16`),
    ]);

    const result: OpenLibraryEnrichment = { editions: [] };

    if (ratingsRes.status === "fulfilled" && ratingsRes.value.ok) {
      const rData = await ratingsRes.value.json();
      if (rData?.summary?.average) {
        result.average10 = Number((rData.summary.average * 2).toFixed(2));
        result.ratingsCount = rData.summary.count || 0;
        result.ratingCounts = rData.counts || undefined;
      }
    }

    if (shelvesRes.status === "fulfilled" && shelvesRes.value.ok) {
      const sData = await shelvesRes.value.json();
      const c = sData?.counts;
      if (c) {
        result.wantToRead = c.want_to_read || 0;
        result.currentlyReading = c.currently_reading || 0;
        result.alreadyRead = c.already_read || 0;
        result.members =
          (c.want_to_read || 0) +
          (c.currently_reading || 0) +
          (c.already_read || 0) +
          (c.stopped_reading || 0);
      }
    }

    if (editionsRes.status === "fulfilled" && editionsRes.value.ok) {
      const eData = await editionsRes.value.json();
      const entries: OLEditionDoc[] = eData?.entries || [];
      result.editions = entries.map((e) => ({
        key: e.key,
        title: e.title || "Edition",
        publishers: e.publishers || [],
        publishDate: e.publish_date,
        pages: e.number_of_pages,
        format: e.physical_format,
      }));
    }

    return result;
  } catch {
    return null;
  }
}
