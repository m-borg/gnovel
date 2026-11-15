import type { GraphicNovel, NovelFormat, OpenLibraryEnrichment } from "./types";

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

function inferFormat(subjects: string[] = [], title = ""): NovelFormat {
  const joined = `${subjects.join(" ")} ${title}`.toLowerCase();
  if (joined.includes("manga")) return "Manga";
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
    ["Manga", ["manga", "seinen", "shonen", "shojo"]],
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

export async function searchOpenLibrary(
  query: string,
  comicsOnly = true,
  signal?: AbortSignal
): Promise<GraphicNovel[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const q = comicsOnly
    ? `${trimmed} subject:(comics OR "graphic novels" OR manga)`
    : trimmed;

  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(
    q
  )}&limit=18&fields=key,title,subtitle,author_name,first_publish_year,cover_i,subject,publisher,number_of_pages_median,edition_count`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Open Library search failed");
  const data = await res.json();
  const docs: OLSearchDoc[] = data.docs || [];

  if (comicsOnly && docs.length === 0) {
    return searchOpenLibrary(trimmed, false, signal);
  }

  return docs
    .filter((d) => d.key && d.title && d.cover_i)
    .slice(0, 15)
    .map((doc) => {
      const olId = extractOlId(doc.key);
      const writers = doc.author_name?.slice(0, 2) || ["Unknown Creator"];
      const novel: GraphicNovel = {
        id: `ol-${olId}`,
        olKey: olId,
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
        coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
        communityScore: 7.85,
        ratingsCount: (doc.edition_count || 1) * 45,
        membersCount: (doc.edition_count || 1) * 180,
        isCurated: false,
      };
      cacheNovelSnapshot(novel);
      return novel;
    });
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
