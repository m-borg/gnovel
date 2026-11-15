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
    <div className="container mx-auto max-w-screen-2xl px-4 py-8 space-y-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">Shelves &amp; Lists</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build ranked top-10s, themed reading orders, and explore editorial spotlights.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setCreateOpen(!createOpen)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          New Custom List
        </Button>
      </div>

      {/* Create List Drawer */}
      {createOpen && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-primary/30 bg-card p-5 space-y-4 max-w-2xl shadow-xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base">Create a Custom List</h2>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Top 10 Sci-Fi Epics, Halloween Horror Marathon..."
              className="h-10 bg-secondary/60 border-white/10"
            />
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description or reading order notes..."
              className="w-full rounded-lg border border-white/10 bg-secondary/60 p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={ranked}
                onChange={(e) => setRanked(e.target.checked)}
                className="rounded border-white/20"
              />
              <ListOrdered className="h-3.5 w-3.5 text-primary" />
              Numbered / Ranked list (#1, #2, #3...)
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create List</Button>
          </div>
        </form>
      )}

      {/* User Lists */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Your Custom Lists ({mounted ? state.lists.length : 0})
          </h2>
        </div>

        {mounted && state.lists.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-card/40 p-8 text-center text-sm text-muted-foreground">
            You haven&apos;t created a custom list yet. Click{" "}
            <strong className="text-foreground">New Custom List</strong> above or use{" "}
            <strong className="text-foreground">Add to Custom List</strong> on any
            graphic novel page.
          </div>
        ) : (
          <div className="space-y-8">
            {state.lists.map((list) => (
              <div
                key={list.id}
                className="rounded-2xl border border-white/10 bg-card/70 p-5 space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-2xl text-foreground">{list.title}</h3>
                      {list.ranked && (
                        <span className="rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          Ranked
                        </span>
                      )}
                    </div>
                    {list.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {list.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setAddingToListId(list.id);
                        setBookQuery("");
                        setRemoteBooks([]);
                      }}
                      className="gap-1.5 border border-white/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Book
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteList(list.id)}
                      className="text-muted-foreground hover:text-rose-400"
                      aria-label={`Delete ${list.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {list.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">
                    This list is empty. Click &ldquo;Add Book&rdquo; to start curating.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {list.items.map((item, idx) => (
                      <div key={item.novelId} className="space-y-1.5">
                        <NovelCard
                          novel={item.novel}
                          rank={list.ranked ? idx + 1 : undefined}
                        />
                        <div className="flex items-center justify-between gap-1 px-1">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveListItem(list.id, idx, -1)}
                              className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-30"
                              aria-label="Move earlier"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === list.items.length - 1}
                              onClick={() => moveListItem(list.id, idx, 1)}
                              className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-30"
                              aria-label="Move later"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleNovelInList(list.id, item.novel)}
                            className="text-[11px] text-muted-foreground hover:text-rose-400"
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
      <section className="space-y-8 pt-6 border-t border-white/10">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Editorial Collections</h2>
          <p className="text-xs text-muted-foreground">
            Curated starting points across the graphic novel canon.
          </p>
        </div>

        <div className="space-y-8">
          {EDITORIAL_COLLECTIONS.map((col) => {
            const novels = col.novelIds
              .map((id) => getCuratedNovelById(id))
              .filter(Boolean) as GraphicNovel[];
            return (
              <div
                key={col.id}
                id={col.id}
                className={cn(
                  "rounded-2xl border border-white/10 bg-gradient-to-br p-5 space-y-5 scroll-mt-20",
                  col.accent
                )}
              >
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-primary/90">
                    {col.curator}
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl text-foreground">
                    {col.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{col.subtitle}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {novels.map((novel) => (
                    <NovelCard key={novel.id} novel={novel} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add Book to List Modal */}
      {activeListForPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddingToListId(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-card p-5 space-y-4 max-h-[82vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm truncate">
                Add to &ldquo;{activeListForPicker.title}&rdquo;
              </h3>
              <button
                type="button"
                onClick={() => setAddingToListId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                autoFocus
                value={bookQuery}
                onChange={(e) => handleSearchBooks(e.target.value)}
                placeholder="Search curated or Open Library..."
                className="pl-9 h-9 bg-secondary/70 border-white/10"
              />
            </div>

            {searching && (
              <p className="text-xs text-muted-foreground">Searching Open Library...</p>
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
                      "flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors",
                      included
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-white/5 bg-secondary/40 hover:bg-secondary"
                    )}
                  >
                    <div className="h-12 w-8 shrink-0 rounded overflow-hidden bg-muted">
                      {novel.coverUrl && (
                        <img
                          src={novel.coverUrl}
                          alt={novel.title}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{novel.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {novel.writers[0]}
                        {novel.year ? ` · ${novel.year}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded-md",
                        included ? "text-emerald-400" : "text-primary"
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
