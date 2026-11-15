import type {
  GraphicNovel,
  NovelFormat,
  RelatedWorkItem,
} from "./types";
import { cacheNovelSnapshot } from "./openlibrary";

interface AniListMediaNode {
  id: number;
  title?: {
    english?: string | null;
    romaji?: string | null;
    native?: string | null;
  };
  synonyms?: string[] | null;
  averageScore?: number | null;
  meanScore?: number | null;
  popularity?: number | null;
  favourites?: number | null;
  chapters?: number | null;
  volumes?: number | null;
  status?: string | null;
  format?: string | null;
  countryOfOrigin?: string | null;
  startDate?: { year?: number | null } | null;
  genres?: string[] | null;
  description?: string | null;
  coverImage?: {
    extraLarge?: string | null;
    large?: string | null;
    medium?: string | null;
  } | null;
  staff?: {
    edges?: {
      role?: string | null;
      node?: { name?: { full?: string | null } | null } | null;
    }[] | null;
  } | null;
  relations?: {
    edges?: {
      relationType?: string | null;
      node?: {
        id: number;
        type?: string | null;
        format?: string | null;
        title?: { english?: string | null; romaji?: string | null } | null;
        coverImage?: { large?: string | null; medium?: string | null } | null;
      } | null;
    }[] | null;
  } | null;
}

export interface AniListBrowseResult {
  items: GraphicNovel[];
  totalFound: number;
  page: number;
  perPage: number;
}

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

function stripHtml(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function inferAniListFormat(
  country?: string | null,
  format?: string | null
): NovelFormat {
  if (country === "KR") return "Manhwa";
  if (format === "ONE_SHOT") return "Graphic Novel";
  return "Manga";
}

function mapAniListMedia(
  media: AniListMediaNode,
  rankHint?: number
): GraphicNovel {
  const title =
    media.title?.english || media.title?.romaji || "Untitled Manga";
  const subtitle =
    media.title?.english &&
    media.title?.romaji &&
    media.title.english !== media.title.romaji
      ? media.title.romaji
      : undefined;

  const altTitles: string[] = [];
  if (media.title?.native) altTitles.push(media.title.native);
  if (media.title?.romaji && media.title.romaji !== title) {
    altTitles.push(media.title.romaji);
  }
  for (const syn of media.synonyms || []) {
    if (syn && !altTitles.includes(syn) && altTitles.length < 4) {
      altTitles.push(syn);
    }
  }

  const writers: string[] = [];
  const artists: string[] = [];
  for (const edge of media.staff?.edges || []) {
    const name = edge.node?.name?.full;
    if (!name) continue;
    const role = (edge.role || "").toLowerCase();
    if (role.includes("story") && !writers.includes(name)) writers.push(name);
    if (role.includes("art") && !artists.includes(name)) artists.push(name);
    if (!role.includes("story") && !role.includes("art") && writers.length === 0) {
      writers.push(name);
    }
  }

  const cleanSynopsis = stripHtml(media.description);
  const scoreRaw = media.averageScore || media.meanScore || 75;
  const score10 = Number((scoreRaw / 10).toFixed(2));
  const members = media.popularity || 1200;

  const relatedEntries: RelatedWorkItem[] = [];
  for (const rel of media.relations?.edges || []) {
    if (!rel.node || rel.node.type !== "MANGA") continue;
    relatedEntries.push({
      id: `al-${rel.node.id}`,
      href: `/novel/?al=${rel.node.id}`,
      relation: (rel.relationType || "Related")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase()),
      title: rel.node.title?.english || rel.node.title?.romaji || "Related Work",
      format: rel.node.format || "Manga",
      coverUrl: rel.node.coverImage?.large || rel.node.coverImage?.medium || "",
    });
  }

  const countryLabel =
    media.countryOfOrigin === "KR"
      ? "South Korea (Manhwa)"
      : media.countryOfOrigin === "CN"
      ? "China (Manhua)"
      : "Japan (Manga)";

  const novel: GraphicNovel = {
    id: `al-${media.id}`,
    anilistId: media.id,
    sourceLabel: "AniList",
    title,
    subtitle,
    altTitles: altTitles.length > 0 ? altTitles : undefined,
    writers: writers.length > 0 ? writers : ["Credited Creator"],
    artists:
      artists.length > 0
        ? artists
        : writers.length > 0
        ? writers
        : ["Credited Artist"],
    publisher: countryLabel,
    year: media.startDate?.year || 0,
    publicationStatus:
      media.status === "RELEASING" ? "Publishing" : "Finished",
    issues: media.chapters || undefined,
    volumes: media.volumes || undefined,
    format: inferAniListFormat(media.countryOfOrigin, media.format),
    genres: (media.genres || ["Manga"]).slice(0, 4),
    deck:
      cleanSynopsis.split("\n")[0]?.slice(0, 160) ||
      `${countryLabel} series indexed via AniList.`,
    synopsis:
      cleanSynopsis ||
      "Detailed synopsis not provided yet in the community archive.",
    relatedEntries: relatedEntries.length > 0 ? relatedEntries.slice(0, 6) : undefined,
    coverUrl:
      media.coverImage?.extraLarge ||
      media.coverImage?.large ||
      media.coverImage?.medium ||
      "",
    communityScore: score10,
    ratingsCount: Math.max(Math.round(members * 0.42), media.favourites || 50),
    membersCount: members,
    ranked: rankHint,
    isCurated: false,
  };

  cacheNovelSnapshot(novel);
  return novel;
}

export async function browseAniList({
  query,
  genre,
  country,
  sort = "score",
  page = 1,
  perPage = 48,
  signal,
}: {
  query?: string;
  genre?: string;
  country?: "JP" | "KR" | "CN";
  sort?: "score" | "popularity" | "newest";
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}): Promise<AniListBrowseResult> {
  const sortEnum =
    sort === "popularity"
      ? ["POPULARITY_DESC"]
      : sort === "newest"
      ? ["START_DATE_DESC", "POPULARITY_DESC"]
      : query
      ? ["SEARCH_MATCH", "POPULARITY_DESC"]
      : ["SCORE_DESC", "POPULARITY_DESC"];

  const gql = `
    query BrowseManga(
      $page: Int,
      $perPage: Int,
      $search: String,
      $genre: String,
      $country: CountryCode,
      $sort: [MediaSort]
    ) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          hasNextPage
        }
        media(
          type: MANGA,
          format_in: [MANGA, ONE_SHOT],
          isAdult: false,
          search: $search,
          genre: $genre,
          countryOfOrigin: $country,
          sort: $sort
        ) {
          id
          title { english romaji native }
          synonyms
          averageScore
          meanScore
          popularity
          favourites
          chapters
          volumes
          status
          format
          countryOfOrigin
          startDate { year }
          genres
          description(asHtml: false)
          coverImage { extraLarge large }
          staff(perPage: 4, sort: [RELEVANCE]) {
            edges {
              role
              node { name { full } }
            }
          }
        }
      }
    }
  `;

  const variables: Record<string, unknown> = {
    page,
    perPage,
    sort: sortEnum,
  };
  if (query && query.trim()) variables.search = query.trim();
  if (genre && genre !== "All") variables.genre = genre;
  if (country) variables.country = country;

  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: gql, variables }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`AniList request failed (${res.status})`);
  }

  const json = await res.json();
  const pageData = json?.data?.Page;
  const mediaList: AniListMediaNode[] = pageData?.media || [];

  return {
    items: mediaList.map((m, idx) =>
      mapAniListMedia(m, (page - 1) * perPage + idx + 1)
    ),
    totalFound: pageData?.pageInfo?.total || mediaList.length,
    page,
    perPage,
  };
}

export async function fetchAniListById(
  id: number,
  fallback?: GraphicNovel
): Promise<GraphicNovel | null> {
  const gql = `
    query SingleManga($id: Int) {
      Media(id: $id, type: MANGA) {
        id
        title { english romaji native }
        synonyms
        averageScore
        meanScore
        popularity
        favourites
        chapters
        volumes
        status
        format
        countryOfOrigin
        startDate { year }
        genres
        description(asHtml: false)
        coverImage { extraLarge large }
        staff(perPage: 6, sort: [RELEVANCE]) {
          edges {
            role
            node { name { full } }
          }
        }
        relations {
          edges {
            relationType
            node {
              id
              type
              format
              title { english romaji }
              coverImage { large medium }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query: gql, variables: { id } }),
    });
    if (!res.ok) return fallback || null;
    const json = await res.json();
    const media: AniListMediaNode | undefined = json?.data?.Media;
    if (!media) return fallback || null;
    return mapAniListMedia(media, fallback?.ranked);
  } catch {
    return fallback || null;
  }
}
