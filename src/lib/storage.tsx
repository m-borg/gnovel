"use client";

import React, { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { CURATED_NOVELS, getCuratedNovelById } from "./catalog";
import type {
  CustomList,
  DiaryEntry,
  EditionFormat,
  GraphicNovel,
  LibraryEntry,
  ReadingStatus,
  UserStoreState,
} from "./types";

const STORAGE_KEY = "gnovel:v3:state";
const LEGACY_V2_KEY = "gnovel:v2:state";

const EMPTY_STATE: UserStoreState = {
  version: 3,
  library: {},
  diary: [],
  lists: [],
  favorites: [],
};

function convertToMal10(rating: number): number {
  if (!rating || rating <= 0) return 0;
  if (rating <= 5) return Math.min(10, Math.max(1, Math.round(rating * 2)));
  return Math.min(10, Math.max(1, Math.round(rating)));
}

function buildStarterState(): UserStoreState {
  const pick = (id: string) => getCuratedNovelById(id) || CURATED_NOVELS[0];
  const now = new Date().toISOString();

  const watchmen = pick("watchmen");
  const saga = pick("saga");
  const daytripper = pick("daytripper");
  const monstress = pick("monstress");
  const maus = pick("maus");
  const akira = pick("akira");
  const asterios = pick("asterios-polyp");

  return {
    version: 3,
    favorites: ["watchmen", "daytripper", "maus", "akira"],
    library: {
      [watchmen.id]: {
        novelId: watchmen.id,
        novel: watchmen,
        status: "completed",
        rating: 10,
        liked: true,
        issuesRead: 12,
        updatedAt: now,
      },
      [daytripper.id]: {
        novelId: daytripper.id,
        novel: daytripper,
        status: "completed",
        rating: 10,
        liked: true,
        issuesRead: 10,
        updatedAt: now,
      },
      [maus.id]: {
        novelId: maus.id,
        novel: maus,
        status: "completed",
        rating: 9,
        liked: true,
        issuesRead: 2,
        updatedAt: now,
      },
      [saga.id]: {
        novelId: saga.id,
        novel: saga,
        status: "reading",
        rating: 9,
        liked: true,
        issuesRead: 32,
        updatedAt: now,
      },
      [monstress.id]: {
        novelId: monstress.id,
        novel: monstress,
        status: "plan",
        rating: 0,
        liked: false,
        issuesRead: 0,
        updatedAt: now,
      },
      [akira.id]: {
        novelId: akira.id,
        novel: akira,
        status: "completed",
        rating: 9,
        liked: true,
        issuesRead: 6,
        updatedAt: now,
      },
      [asterios.id]: {
        novelId: asterios.id,
        novel: asterios,
        status: "plan",
        rating: 0,
        liked: false,
        issuesRead: 0,
        updatedAt: now,
      },
    },
    diary: [
      {
        id: "seed-1",
        novelId: daytripper.id,
        novel: daytripper,
        date: "2026-11-08",
        status: "completed",
        rating: 10,
        edition: "TPB / Paperback",
        reread: false,
        review:
          "Every chapter hits like a short story that quietly sneaks up on you. Fábio Moon and Gabriel Bá make São Paulo glow with warmth and ache.",
        spoiler: false,
        createdAt: "2026-11-08T19:30:00.000Z",
      },
      {
        id: "seed-2",
        novelId: saga.id,
        novel: saga,
        date: "2026-11-02",
        status: "reading",
        rating: 9,
        edition: "Hardcover / Omnibus",
        reread: false,
        review:
          "Halfway through Book Two. Fiona Staples' creature design and pacing are absurdly good—nobody writes dialogue like Vaughan.",
        spoiler: false,
        createdAt: "2026-11-02T21:15:00.000Z",
      },
      {
        id: "seed-3",
        novelId: watchmen.id,
        novel: watchmen,
        date: "2026-10-19",
        status: "completed",
        rating: 10,
        edition: "Hardcover / Omnibus",
        reread: true,
        review:
          "Third re-read and the symmetry of Issue 5 ('Fearful Symmetry') still blows my mind. Every panel is load-bearing.",
        spoiler: false,
        createdAt: "2026-10-19T14:00:00.000Z",
      },
      {
        id: "seed-4",
        novelId: akira.id,
        novel: akira,
        date: "2026-09-27",
        status: "completed",
        rating: 9,
        edition: "TPB / Paperback",
        reread: false,
        review:
          "The sense of architectural scale and kinetic destruction across Otomo's spreads is still completely unmatched.",
        spoiler: false,
        createdAt: "2026-09-27T18:45:00.000Z",
      },
    ],
    lists: [
      {
        id: "list-rainy-weekend",
        title: "All-Time Desert Island Shelf",
        description: "Books I would hand to anyone who claims comics aren't literature.",
        ranked: true,
        items: [
          { novelId: watchmen.id, novel: watchmen, note: "Still the blueprint." },
          { novelId: maus.id, novel: maus, note: "Essential historical witness." },
          { novelId: daytripper.id, novel: daytripper, note: "Pure emotional precision." },
          { novelId: akira.id, novel: akira, note: "Unmatched visual velocity." },
        ],
        updatedAt: now,
      },
    ],
  };
}

interface LogPayload {
  novel: GraphicNovel;
  date: string;
  status: Exclude<ReadingStatus, "none">;
  rating: number;
  edition: EditionFormat;
  reread: boolean;
  review: string;
  spoiler: boolean;
  liked?: boolean;
  issuesRead?: number;
}

interface GNovelContextValue {
  state: UserStoreState;
  mounted: boolean;
  getEntry: (novelId: string) => LibraryEntry | undefined;
  setStatus: (novel: GraphicNovel, status: ReadingStatus) => void;
  setRating: (novel: GraphicNovel, rating: number) => void;
  toggleLike: (novel: GraphicNovel) => void;
  setProgress: (novel: GraphicNovel, issuesRead: number) => void;
  setCustomUrl: (novel: GraphicNovel, url: string) => void;
  addDiaryLog: (payload: LogPayload) => void;
  deleteDiaryLog: (logId: string) => void;
  createList: (title: string, description: string, ranked: boolean) => CustomList;
  deleteList: (listId: string) => void;
  toggleNovelInList: (listId: string, novel: GraphicNovel, note?: string) => void;
  moveListItem: (listId: string, index: number, direction: -1 | 1) => void;
  setFavoriteSlot: (slotIndex: number, novelId: string | null) => void;
  loadStarterShelf: () => void;
  clearAllData: () => void;
  exportJson: () => string;
  importJson: (raw: string) => { ok: boolean; error?: string };
}

const GNovelContext = createContext<GNovelContextValue | null>(null);

const emptySubscribe = () => () => {};
const STORE_EVENT = "gnovel-store-update";

let cachedRaw: string | null = null;
let cachedSnapshot: UserStoreState = EMPTY_STATE;

function migrateV2toV3(v2: {
  library?: Record<string, LibraryEntry>;
  diary?: DiaryEntry[];
  lists?: CustomList[];
  favorites?: string[];
}): UserStoreState {
  const nextLib: Record<string, LibraryEntry> = {};
  for (const [k, entry] of Object.entries(v2.library || {})) {
    nextLib[k] = {
      ...entry,
      rating: convertToMal10(entry.rating),
    };
  }
  const nextDiary = (v2.diary || []).map((d) => ({
    ...d,
    rating: convertToMal10(d.rating),
  }));
  return {
    version: 3,
    library: nextLib,
    diary: nextDiary,
    lists: Array.isArray(v2.lists) ? v2.lists : [],
    favorites: Array.isArray(v2.favorites) ? v2.favorites : [],
  };
}

function getClientSnapshot(): UserStoreState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw && raw !== null) return cachedSnapshot;
    if (raw) {
      cachedRaw = raw;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 3) {
        cachedSnapshot = parsed;
        return cachedSnapshot;
      }
    }
    const legacy = localStorage.getItem(LEGACY_V2_KEY);
    if (legacy) {
      const parsedV2 = JSON.parse(legacy);
      if (parsedV2 && parsedV2.version === 2) {
        const migrated = migrateV2toV3(parsedV2);
        const migratedRaw = JSON.stringify(migrated);
        localStorage.setItem(STORAGE_KEY, migratedRaw);
        cachedRaw = migratedRaw;
        cachedSnapshot = migrated;
        return cachedSnapshot;
      }
    }
  } catch {
    // Ignore malformed storage
  }
  cachedRaw = null;
  cachedSnapshot = EMPTY_STATE;
  return cachedSnapshot;
}

function getServerSnapshot(): UserStoreState {
  return EMPTY_STATE;
}

function subscribeStore(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(STORE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STORE_EVENT, callback);
  };
}

export function GNovelProvider({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const state = useSyncExternalStore(
    subscribeStore,
    getClientSnapshot,
    getServerSnapshot
  );

  const updateState = useCallback((updater: (prev: UserStoreState) => UserStoreState) => {
    const prev = getClientSnapshot();
    const next = updater(prev);
    try {
      const raw = JSON.stringify(next);
      cachedRaw = raw;
      cachedSnapshot = next;
      localStorage.setItem(STORAGE_KEY, raw);
      window.dispatchEvent(new Event(STORE_EVENT));
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const getEntry = useCallback(
    (novelId: string) => state.library[novelId],
    [state.library]
  );

  const upsertLibrary = useCallback(
    (
      novel: GraphicNovel,
      patch: Partial<
        Pick<LibraryEntry, "status" | "rating" | "liked" | "issuesRead" | "customUrl">
      >
    ) => {
      updateState((prev) => {
        const existing = prev.library[novel.id];
        const nextEntry: LibraryEntry = {
          novelId: novel.id,
          novel,
          status: patch.status ?? existing?.status ?? "none",
          rating: patch.rating ?? existing?.rating ?? 0,
          liked: patch.liked ?? existing?.liked ?? false,
          issuesRead: patch.issuesRead ?? existing?.issuesRead ?? 0,
          customUrl: patch.customUrl !== undefined ? patch.customUrl : existing?.customUrl,
          updatedAt: new Date().toISOString(),
        };

        const library = { ...prev.library };
        if (
          nextEntry.status === "none" &&
          nextEntry.rating === 0 &&
          !nextEntry.liked &&
          nextEntry.issuesRead === 0 &&
          !nextEntry.customUrl
        ) {
          delete library[novel.id];
        } else {
          library[novel.id] = nextEntry;
        }
        return { ...prev, library };
      });
    },
    [updateState]
  );

  const setStatus = useCallback(
    (novel: GraphicNovel, status: ReadingStatus) => {
      const existing = state.library[novel.id];
      const nextStatus = existing?.status === status ? "none" : status;
      const autoProgress =
        nextStatus === "completed" &&
        novel.issues &&
        (!existing?.issuesRead || existing.issuesRead < novel.issues)
          ? novel.issues
          : existing?.issuesRead ?? 0;
      upsertLibrary(novel, { status: nextStatus, issuesRead: autoProgress });
    },
    [state.library, upsertLibrary]
  );

  const setRating = useCallback(
    (novel: GraphicNovel, rating: number) => {
      const cleanRating = Math.max(0, Math.min(10, Math.round(rating)));
      const existing = state.library[novel.id];
      const nextStatus =
        existing?.status && existing.status !== "none"
          ? existing.status
          : cleanRating > 0
          ? "completed"
          : "none";
      upsertLibrary(novel, { rating: cleanRating, status: nextStatus });
    },
    [state.library, upsertLibrary]
  );

  const toggleLike = useCallback(
    (novel: GraphicNovel) => {
      const existing = state.library[novel.id];
      upsertLibrary(novel, { liked: !(existing?.liked ?? false) });
    },
    [state.library, upsertLibrary]
  );

  const setProgress = useCallback(
    (novel: GraphicNovel, issuesRead: number) => {
      const safeCount = Math.max(0, issuesRead);
      const existing = state.library[novel.id];
      const nextStatus =
        existing?.status && existing.status !== "none"
          ? existing.status
          : safeCount > 0
          ? "reading"
          : "none";
      upsertLibrary(novel, { issuesRead: safeCount, status: nextStatus });
    },
    [state.library, upsertLibrary]
  );

  const setCustomUrl = useCallback(
    (novel: GraphicNovel, url: string) => {
      upsertLibrary(novel, { customUrl: url.trim() || undefined });
    },
    [upsertLibrary]
  );

  const addDiaryLog = useCallback(
    (payload: LogPayload) => {
      updateState((prev) => {
        const entry: DiaryEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          novelId: payload.novel.id,
          novel: payload.novel,
          date: payload.date,
          status: payload.status,
          rating: Math.max(0, Math.min(10, Math.round(payload.rating))),
          edition: payload.edition,
          reread: payload.reread,
          review: payload.review.trim(),
          spoiler: payload.spoiler,
          createdAt: new Date().toISOString(),
        };

        const existing = prev.library[payload.novel.id];
        const autoIssues =
          payload.issuesRead !== undefined
            ? payload.issuesRead
            : payload.status === "completed" && payload.novel.issues
            ? payload.novel.issues
            : existing?.issuesRead ?? 0;

        const nextLibrary: LibraryEntry = {
          novelId: payload.novel.id,
          novel: payload.novel,
          status: payload.status,
          rating: entry.rating || existing?.rating || 0,
          liked: payload.liked ?? existing?.liked ?? false,
          issuesRead: autoIssues,
          customUrl: existing?.customUrl,
          updatedAt: new Date().toISOString(),
        };

        return {
          ...prev,
          library: {
            ...prev.library,
            [payload.novel.id]: nextLibrary,
          },
          diary: [entry, ...prev.diary].sort(
            (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
          ),
        };
      });
    },
    [updateState]
  );

  const deleteDiaryLog = useCallback(
    (logId: string) => {
      updateState((prev) => ({
        ...prev,
        diary: prev.diary.filter((d) => d.id !== logId),
      }));
    },
    [updateState]
  );

  const createList = useCallback(
    (title: string, description: string, ranked: boolean): CustomList => {
      const list: CustomList = {
        id: `list-${Date.now()}`,
        title: title.trim() || "Untitled Shelf",
        description: description.trim(),
        ranked,
        items: [],
        updatedAt: new Date().toISOString(),
      };
      updateState((prev) => ({
        ...prev,
        lists: [list, ...prev.lists],
      }));
      return list;
    },
    [updateState]
  );

  const deleteList = useCallback(
    (listId: string) => {
      updateState((prev) => ({
        ...prev,
        lists: prev.lists.filter((l) => l.id !== listId),
      }));
    },
    [updateState]
  );

  const toggleNovelInList = useCallback(
    (listId: string, novel: GraphicNovel, note?: string) => {
      updateState((prev) => ({
        ...prev,
        lists: prev.lists.map((list) => {
          if (list.id !== listId) return list;
          const exists = list.items.some((i) => i.novelId === novel.id);
          const items = exists
            ? list.items.filter((i) => i.novelId !== novel.id)
            : [...list.items, { novelId: novel.id, novel, note }];
          return { ...list, items, updatedAt: new Date().toISOString() };
        }),
      }));
    },
    [updateState]
  );

  const moveListItem = useCallback(
    (listId: string, index: number, direction: -1 | 1) => {
      updateState((prev) => ({
        ...prev,
        lists: prev.lists.map((list) => {
          if (list.id !== listId) return list;
          const target = index + direction;
          if (target < 0 || target >= list.items.length) return list;
          const items = [...list.items];
          const [moved] = items.splice(index, 1);
          items.splice(target, 0, moved);
          return { ...list, items, updatedAt: new Date().toISOString() };
        }),
      }));
    },
    [updateState]
  );

  const setFavoriteSlot = useCallback(
    (slotIndex: number, novelId: string | null) => {
      updateState((prev) => {
        const next = [...prev.favorites];
        while (next.length < 4) next.push("");
        if (novelId) {
          for (let i = 0; i < 4; i++) {
            if (next[i] === novelId) next[i] = "";
          }
        }
        next[slotIndex] = novelId || "";
        return {
          ...prev,
          favorites: next.filter(Boolean),
        };
      });
    },
    [updateState]
  );

  const loadStarterShelf = useCallback(() => {
    updateState(() => buildStarterState());
  }, [updateState]);

  const clearAllData = useCallback(() => {
    updateState(() => EMPTY_STATE);
  }, [updateState]);

  const exportJson = useCallback(() => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importJson = useCallback(
    (raw: string): { ok: boolean; error?: string } => {
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.library !== "object") {
          return { ok: false, error: "Invalid GNovel backup file format." };
        }
        const normalized =
          parsed.version === 2 ? migrateV2toV3(parsed) : (parsed as UserStoreState);
        updateState(() => ({
          version: 3,
          library: normalized.library || {},
          diary: Array.isArray(normalized.diary) ? normalized.diary : [],
          lists: Array.isArray(normalized.lists) ? normalized.lists : [],
          favorites: Array.isArray(normalized.favorites) ? normalized.favorites : [],
        }));
        return { ok: true };
      } catch {
        return { ok: false, error: "Could not parse JSON file." };
      }
    },
    [updateState]
  );

  return (
    <GNovelContext.Provider
      value={{
        state,
        mounted,
        getEntry,
        setStatus,
        setRating,
        toggleLike,
        setProgress,
        setCustomUrl,
        addDiaryLog,
        deleteDiaryLog,
        createList,
        deleteList,
        toggleNovelInList,
        moveListItem,
        setFavoriteSlot,
        loadStarterShelf,
        clearAllData,
        exportJson,
        importJson,
      }}
    >
      {children}
    </GNovelContext.Provider>
  );
}

export function useGNovel() {
  const ctx = useContext(GNovelContext);
  if (!ctx) throw new Error("useGNovel must be used inside GNovelProvider");
  return ctx;
}
