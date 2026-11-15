"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ListOrdered,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NovelCard } from "@/components/NovelCard";
import {
  CURATED_NOVELS,
  EDITORIAL_COLLECTIONS,
  getCuratedNovelById,
} from "@/lib/catalog";
import { searchOpenLibrary } from "@/lib/openlibrary";
import { useGNovel } from "@/lib/storage";
import type { GraphicNovel } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ListsPage() {
  const {
    state,
    mounted,
    createList,
    deleteList,
    toggleNovelInList,
    moveListItem,
  } = useGNovel();

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ranked, setRanked] = useState(true);

  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [bookQuery, setBookQuery] = useState("");
  const [remoteBooks, setRemoteBooks] = useState<GraphicNovel[]>([]);
  const [searching, setSearching] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createList(title, description, ranked);
    setTitle("");
    setDescription("");
    setRanked(true);
    setCreateOpen(false);
  };

  const handleSearchBooks = async (q: string) => {
    setBookQuery(q);
    if (q.trim().length < 2) {
      setRemoteBooks([]);
      return;
    }
    setSearching(true);
    try {
      const res = await searchOpenLibrary(q.trim(), true);
      setRemoteBooks(res.slice(0, 6));
    } catch {
      // Ignore errors
    } finally {
      setSearching(false);
    }
  };

  const bookOptions = useMemo(() => {
    const q = bookQuery.trim().toLowerCase();
    const local = q
      ? CURATED_NOVELS.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.writers.some((w) => w.toLowerCase().includes(q))
        )
      : CURATED_NOVELS.slice(0, 8);
    const seen = new Set(local.map((n) => n.id));
    return [...local, ...remoteBooks.filter((r) => !seen.has(r.id))].slice(0, 10);
  }, [bookQuery, remoteBooks]);

  const activeListForPicker = state.lists.find((l) => l.id === addingToListId);

  return (
    <div className="mx-auto max-w-[1080px] border-x border-b border-[#2A2A2A] bg-[#121212]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E2E2E] bg-[#222222] px-4 py-2.5">
        <h1 className="text-base sm:text-lg font-bold text-white">
          Interest Stacks &amp; Custom Lists
        </h1>
        <button
          type="button"
          onClick={() => setCreateOpen(!createOpen)}
          className="inline-flex items-center gap-1 rounded-[2px] bg-[#2E51A2] hover:bg-[#3A62BE] px-2.5 py-1 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          New Custom List
        </button>
      </div>

      <div className="p-3 sm:p-4 space-y-8">
        {createOpen && (
          <form
            onSubmit={handleCreate}
            className="border border-[#4C74D6] bg-[#161616] p-4 space-y-3 max-w-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-2">
              <h2 className="font-bold text-white">Create Custom List</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-[#9B9B9B] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Top 10 Sci-Fi Epics, Essential Alan Moore..."
              className="h-8 bg-[#121212] border-[#333333] text-xs"
            />
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description or reading order notes..."
              className="w-full border border-[#333333] bg-[#121212] p-2 text-xs text-white placeholder:text-[#666666] focus:outline-none focus:border-[#4C74D6] resize-none"
            />
            <label className="inline-flex items-center gap-2 text-xs text-[#CCCCCC] cursor-pointer">
              <input
                type="checkbox"
                checked={ranked}
                onChange={(e) => setRanked(e.target.checked)}
              />
              <ListOrdered className="h-3.5 w-3.5 text-[#8EB4FF]" />
              Ranked list (#1, #2, #3...)
            </label>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <button
                type="submit"
                className="px-3 h-8 rounded-[2px] bg-[#2E51A2] hover:bg-[#3A62BE] text-white font-semibold"
              >
                Create List
              </button>
            </div>
          </form>
        )}

        {/* User Lists */}
        <section className="space-y-4">
          <h2 className="border-b border-[#2E2E2E] pb-1 text-sm font-bold text-white">
            Your Custom Lists ({mounted ? state.lists.length : 0})
          </h2>

          {mounted && state.lists.length === 0 ? (
            <div className="border border-[#2C2C2C] bg-[#161616] p-6 text-center text-xs text-[#9B9B9B]">
              No custom lists yet. Click <strong className="text-white">New Custom List</strong>{" "}
              above or add titles from any graphic novel page.
            </div>
          ) : (
            <div className="space-y-5">
              {state.lists.map((list) => (
                <div
                  key={list.id}
                  className="border border-[#2C2C2C] bg-[#161616] p-3.5 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#262626] pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-white">{list.title}</h3>
                        {list.ranked && (
                          <span className="bg-[#2E51A2] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                            Ranked
                          </span>
                        )}
                      </div>
                      {list.description && (
                        <p className="text-xs text-[#9B9B9B] mt-0.5">{list.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setAddingToListId(list.id);
                          setBookQuery("");
                          setRemoteBooks([]);
                        }}
                        className="inline-flex items-center gap-1 rounded-[2px] border border-[#3A3A3A] bg-[#222222] px-2.5 py-1 text-white hover:bg-[#2E51A2]"
                      >
                        <Plus className="h-3 w-3" />
                        Add Entry
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteList(list.id)}
                        className="p-1 text-[#9B9B9B] hover:text-[#FB7185]"
                        aria-label={`Delete ${list.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {list.items.length === 0 ? (
                    <p className="text-xs text-[#9B9B9B]">
                      Empty list — click &ldquo;Add Entry&rdquo; to populate it.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {list.items.map((item, idx) => (
                        <div key={item.novelId} className="space-y-1">
                          <NovelCard
                            novel={item.novel}
                            rank={list.ranked ? idx + 1 : undefined}
                          />
                          <div className="flex items-center justify-between text-[10px] px-0.5">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveListItem(list.id, idx, -1)}
                                className="p-0.5 text-[#9B9B9B] hover:text-white disabled:opacity-30"
                                aria-label="Move up"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === list.items.length - 1}
                                onClick={() => moveListItem(list.id, idx, 1)}
                                className="p-0.5 text-[#9B9B9B] hover:text-white disabled:opacity-30"
                                aria-label="Move down"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleNovelInList(list.id, item.novel)}
                              className="text-[#9B9B9B] hover:text-[#FB7185]"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Editorial Collections */}
        <section className="space-y-4">
          <h2 className="border-b border-[#2E2E2E] pb-1 text-sm font-bold text-white">
            Editorial Interest Stacks
          </h2>

          <div className="space-y-4">
            {EDITORIAL_COLLECTIONS.map((col) => {
              const novels = col.novelIds
                .map((id) => getCuratedNovelById(id))
                .filter(Boolean) as GraphicNovel[];
              return (
                <div
                  key={col.id}
                  id={col.id}
                  className={cn(
                    "border border-[#2C2C2C] bg-gradient-to-b p-3.5 space-y-3 scroll-mt-16",
                    col.accent
                  )}
                >
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#8EB4FF]">
                      {col.curator}
                    </span>
                    <h3 className="text-sm font-bold text-white">{col.title}</h3>
                    <p className="text-xs text-[#9B9B9B]">{col.subtitle}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {novels.map((novel) => (
                      <NovelCard key={novel.id} novel={novel} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Add Book to List Modal */}
      {activeListForPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddingToListId(null);
          }}
        >
          <div className="w-full max-w-lg border border-[#333333] bg-[#181818] p-4 space-y-3 max-h-[82vh] flex flex-col text-xs">
            <div className="flex items-center justify-between border-b border-[#2C2C2C] pb-2">
              <h3 className="font-bold text-white truncate">
                Add to &ldquo;{activeListForPicker.title}&rdquo;
              </h3>
              <button
                type="button"
                onClick={() => setAddingToListId(null)}
                className="text-[#9B9B9B] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="h-3.5 w-3.5 text-[#9B9B9B] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                autoFocus
                value={bookQuery}
                onChange={(e) => handleSearchBooks(e.target.value)}
                placeholder="Search curated or Open Library..."
                className="pl-8 h-8 bg-[#121212] border-[#333333] text-xs"
              />
            </div>

            {searching && (
              <p className="text-[11px] text-[#9B9B9B]">Searching Open Library...</p>
            )}

            <div className="space-y-1.5 overflow-y-auto pr-1">
              {bookOptions.map((novel) => {
                const included = activeListForPicker.items.some(
                  (i) => i.novelId === novel.id
                );
                return (
                  <button
                    key={novel.id}
                    type="button"
                    onClick={() => toggleNovelInList(activeListForPicker.id, novel)}
                    className={cn(
                      "flex w-full items-center gap-3 border p-2 text-left transition-colors",
                      included
                        ? "border-[#2DB039]/50 bg-[#2DB039]/10"
                        : "border-[#2C2C2C] bg-[#141414] hover:border-[#4C74D6]"
                    )}
                  >
                    <div className="h-12 w-8 shrink-0 overflow-hidden bg-[#222222]">
                      {novel.coverUrl && (
                        <img
                          src={novel.coverUrl}
                          alt={novel.title}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white truncate">{novel.title}</p>
                      <p className="text-[11px] text-[#9B9B9B] truncate">
                        {novel.writers[0]}
                        {novel.year ? ` · ${novel.year}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-semibold px-2 py-0.5",
                        included ? "text-[#4ADE80]" : "text-[#8EB4FF]"
                      )}
                    >
                      {included ? "Added ✓" : "+ Add"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
