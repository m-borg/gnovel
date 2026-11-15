export type NovelFormat =
  | "Series"
  | "Graphic Novel"
  | "Omnibus"
  | "Manga"
  | "Manhwa";

export type ReadingStatus =
  | "none"
  | "reading"
  | "completed"
  | "plan"
  | "on_hold"
  | "dropped";

export type EditionFormat =
  | "TPB / Paperback"
  | "Hardcover / Omnibus"
  | "Single Issues"
  | "Digital";

export interface IssueItem {
  number: number;
  title: string;
  date?: string;
}

export interface RelatedWorkItem {
  id: string;
  href: string;
  relation: string;
  title: string;
  format: string;
  coverUrl: string;
}

export interface GraphicNovel {
  id: string;
  olKey?: string;
  anilistId?: number;
  sourceLabel?: string;
  title: string;
  subtitle?: string;
  altTitles?: string[];
  writers: string[];
  artists: string[];
  publisher: string;
  year: number;
  publicationStatus?: "Finished" | "Publishing";
  issues?: number;
  volumes?: number;
  pages?: number;
  format: NovelFormat;
  genres: string[];
  deck: string;
  synopsis: string;
  background?: string;
  issuesList?: IssueItem[];
  relatedEntries?: RelatedWorkItem[];
  coverUrl: string;
  communityScore: number; // 0-10 MAL scale (e.g. 9.24)
  ratingsCount: number;
  membersCount?: number;
  ranked?: number;
  popularity?: number;
  isCurated?: boolean;
}

export interface LibraryEntry {
  novelId: string;
  novel: GraphicNovel;
  status: ReadingStatus;
  rating: number; // 0 = unscored, 1..10 MAL integer scale
  liked: boolean;
  issuesRead: number;
  customUrl?: string;
  updatedAt: string;
}

export interface DiaryEntry {
  id: string;
  novelId: string;
  novel: GraphicNovel;
  date: string; // YYYY-MM-DD
  status: Exclude<ReadingStatus, "none">;
  rating: number; // 0 = unscored, 1..10 MAL scale
  edition: EditionFormat;
  reread: boolean;
  review: string;
  spoiler: boolean;
  createdAt: string;
}

export interface CustomListItem {
  novelId: string;
  novel: GraphicNovel;
  note?: string;
}

export interface CustomList {
  id: string;
  title: string;
  description: string;
  ranked: boolean;
  items: CustomListItem[];
  updatedAt: string;
}

export interface EditorialCollection {
  id: string;
  title: string;
  subtitle: string;
  curator: string;
  accent: string;
  novelIds: string[];
}

export interface UserStoreState {
  version: 3;
  library: Record<string, LibraryEntry>;
  diary: DiaryEntry[];
  lists: CustomList[];
  favorites: string[];
}

export interface OpenLibraryEnrichment {
  average10?: number;
  ratingsCount?: number;
  ratingCounts?: Record<string, number>;
  members?: number;
  wantToRead?: number;
  currentlyReading?: number;
  alreadyRead?: number;
  editions: {
    key: string;
    title: string;
    publishers: string[];
    publishDate?: string;
    pages?: number;
    format?: string;
  }[];
}
