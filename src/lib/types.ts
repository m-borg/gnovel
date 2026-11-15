export type NovelFormat = "Series" | "Graphic Novel" | "Omnibus" | "Manga";

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

export interface GraphicNovel {
  id: string;
  olKey?: string;
  title: string;
  subtitle?: string;
  writers: string[];
  artists: string[];
  publisher: string;
  year: number;
  issues?: number;
  pages?: number;
  format: NovelFormat;
  genres: string[];
  deck: string;
  synopsis: string;
  coverUrl: string;
  communityScore: number; // 0-5 scale
  ratingsCount: number;
  isCurated?: boolean;
}

export interface LibraryEntry {
  novelId: string;
  novel: GraphicNovel;
  status: ReadingStatus;
  rating: number; // 0 to 5 in 0.5 increments
  liked: boolean;
  issuesRead: number;
  updatedAt: string;
}

export interface DiaryEntry {
  id: string;
  novelId: string;
  novel: GraphicNovel;
  date: string; // YYYY-MM-DD
  status: Exclude<ReadingStatus, "none">;
  rating: number; // 0 to 5 in 0.5 increments
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
  version: 2;
  library: Record<string, LibraryEntry>;
  diary: DiaryEntry[];
  lists: CustomList[];
  favorites: string[]; // up to 4 novelIds
}
