"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Search, Heart, RotateCcw, EyeOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "./StarRating";
import { CURATED_NOVELS } from "@/lib/catalog";
import { searchOpenLibrary } from "@/lib/openlibrary";
import { STATUS_OPTIONS } from "@/lib/status";
import { useGNovel } from "@/lib/storage";
import type { EditionFormat, GraphicNovel, ReadingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LogModalProps {
  open: boolean;
  onClose: () => void;
  initialNovel?: GraphicNovel | null;
}

const EDITIONS: EditionFormat[] = [
  "TPB / Paperback",
  "Hardcover / Omnibus",
  "Single Issues",
  "Digital",
];

export function LogModal({ open, onClose, initialNovel }: LogModalProps) {
  if (!open) return null;
  return (
    <LogModalBody
      key={initialNovel?.id || "picker"}
      onClose={onClose}
      initialNovel={initialNovel}
    />
  );
}

function LogModalBody({
  onClose,
  initialNovel,
}: {
  onClose: () => void;
  initialNovel?: GraphicNovel | null;
}) {
  const { addDiaryLog, getEntry } = useGNovel();
  const initialEntry = initialNovel ? getEntry(initialNovel.id) : undefined;

  const [selectedNovel, setSelectedNovel] = useState<GraphicNovel | null>(
    initialNovel || null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteResults, setRemoteResults] = useState<GraphicNovel[]>([]);
  const [searching, setSearching] = useState(false);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<Exclude<ReadingStatus, "none">>(() =>
    initialEntry?.status && initialEntry.status !== "none"
      ? initialEntry.status
      : "completed"
  );
  const [rating, setRating] = useState(() => initialEntry?.rating || 0);
  const [liked, setLiked] = useState(() => initialEntry?.liked || false);
  const [edition, setEdition] = useState<EditionFormat>("TPB / Paperback");
  const [reread, setReread] = useState(false);
  const [issuesRead, setIssuesRead] = useState(
    () => initialEntry?.issuesRead ?? initialNovel?.issues ?? 0
  );
  const [review, setReview] = useState("");
  const [spoiler, setSpoiler] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length < 2) {
      setRemoteResults([]);
      setSearching(false);
    }
  };

  useEffect(() => {
    if (selectedNovel) return;
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchOpenLibrary(trimmed, true, controller.signal);
        setRemoteResults(res.slice(0, 6));
      } catch {
        // Ignore abort
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedNovel, searchQuery]);

  const pickerResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const localMatches = q
      ? CURATED_NOVELS.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.writers.some((w) => w.toLowerCase().includes(q)) ||
            n.publisher.toLowerCase().includes(q)
        )
      : CURATED_NOVELS.slice(0, 6);

    const seen = new Set(localMatches.map((n) => n.id));
    const merged = [...localMatches];
    for (const r of remoteResults) {
      if (!seen.has(r.id)) merged.push(r);
    }
    return merged.slice(0, 8);
  }, [searchQuery, remoteResults]);

  const handleSelectNovel = (novel: GraphicNovel) => {
    setSelectedNovel(novel);
    const existing = getEntry(novel.id);
    setStatus(
      existing?.status && existing.status !== "none" ? existing.status : "completed"
    );
    setRating(existing?.rating || 0);
    setLiked(existing?.liked || false);
    setIssuesRead(existing?.issuesRead ?? novel.issues ?? 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNovel) return;
    addDiaryLog({
      novel: selectedNovel,
      date,
      status,
      rating,
      edition,
      reread,
      review,
      spoiler,
      liked,
      issuesRead,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Log a graphic novel"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-base tracking-tight">
              {selectedNovel ? "Log in Reading Diary" : "Choose a Graphic Novel to Log"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!selectedNovel ? (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search Watchmen, Akira, Persepolis, or any title..."
                className="pl-9 h-10 bg-secondary/70 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{searchQuery ? "Matches" : "Popular in Canon"}</span>
                {searching && <span>Searching Open Library...</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {pickerResults.map((novel) => (
                  <button
                    key={novel.id}
                    type="button"
                    onClick={() => handleSelectNovel(novel)}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-secondary/40 hover:bg-secondary hover:border-primary/40 text-left transition-all"
                  >
                    <div className="w-11 h-16 shrink-0 rounded-md overflow-hidden bg-muted border border-white/10">
                      {novel.coverUrl && (
                        <img
                          src={novel.coverUrl}
                          alt={novel.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate text-foreground">
                        {novel.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {novel.writers[0]}
                        {novel.year ? ` · ${novel.year}` : ""}
                      </p>
                      <span className="inline-block mt-1 text-[10px] uppercase tracking-wider text-primary/80">
                        {novel.format}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto">
            <div className="flex items-center gap-4 pb-4 border-b border-white/10">
              <div className="w-14 h-21 shrink-0 rounded-lg overflow-hidden bg-muted border border-white/10 shadow-md">
                {selectedNovel.coverUrl && (
                  <img
                    src={selectedNovel.coverUrl}
                    alt={selectedNovel.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-xl font-normal tracking-tight truncate">
                  {selectedNovel.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedNovel.writers.join(", ")}
                  {selectedNovel.year ? ` · ${selectedNovel.year}` : ""}
                </p>
                {!initialNovel && (
                  <button
                    type="button"
                    onClick={() => setSelectedNovel(null)}
                    className="mt-1.5 text-xs text-primary hover:underline"
                  >
                    Change title
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date Logged
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 bg-secondary/70 border-white/10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Edition Format
                </label>
                <select
                  value={edition}
                  onChange={(e) => setEdition(e.target.value as EditionFormat)}
                  className="w-full h-9 rounded-lg border border-white/10 bg-secondary/70 px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {EDITIONS.map((ed) => (
                    <option key={ed} value={ed} className="bg-card">
                      {ed}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Shelf Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      status === opt.value
                        ? opt.badgeClass
                        : "border-white/10 bg-secondary/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-secondary/40 border border-white/5 p-3.5">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                  Rating
                </span>
                <StarRating
                  value={rating}
                  onChange={(val) => setRating(rating === val ? 0 : val)}
                  size="md"
                  showLabel
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLiked(!liked)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                    liked
                      ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                      : "bg-secondary/60 border-white/10 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Heart className={cn("w-3.5 h-3.5", liked && "fill-rose-400")} />
                  {liked ? "Liked" : "Like"}
                </button>

                <button
                  type="button"
                  onClick={() => setReread(!reread)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                    reread
                      ? "bg-sky-500/15 border-sky-500/30 text-sky-300"
                      : "bg-secondary/60 border-white/10 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Re-read
                </button>
              </div>
            </div>

            {selectedNovel.issues && (
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground font-medium">
                  Issues / Volumes Read
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={selectedNovel.issues}
                    value={issuesRead}
                    onChange={(e) => setIssuesRead(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-20 h-8 text-center bg-secondary/70 border-white/10"
                  />
                  <span className="text-muted-foreground font-mono">
                    / {selectedNovel.issues}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Review / Notes
                </label>
                <button
                  type="button"
                  onClick={() => setSpoiler(!spoiler)}
                  className={cn(
                    "inline-flex items-center gap-1 text-xs transition-colors",
                    spoiler ? "text-amber-400" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  {spoiler ? "Contains spoilers" : "Mark spoilers"}
                </button>
              </div>
              <textarea
                rows={4}
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Thoughts on the artwork, pacing, lettering, or ending..."
                className="w-full rounded-xl border border-white/10 bg-secondary/60 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-5">
                Save Entry
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
