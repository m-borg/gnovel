"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Search, Heart, RotateCcw, EyeOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "./StarRating";
import { browseAniList } from "@/lib/anilist";
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
        const [olRes, alRes] = await Promise.allSettled([
          searchOpenLibrary(trimmed, true, controller.signal),
          browseAniList({
            query: trimmed,
            page: 1,
            perPage: 5,
            signal: controller.signal,
          }),
        ]);
        const merged = [
          ...(olRes.status === "fulfilled" ? olRes.value.slice(0, 4) : []),
          ...(alRes.status === "fulfilled" ? alRes.value.items.slice(0, 4) : []),
        ];
        setRemoteResults(merged);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Log a graphic novel"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl border border-[#333333] bg-[#181818] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#2C2C2C] bg-[#222222] px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#8EB4FF]" />
            <h2 className="font-bold text-sm text-white">
              {selectedNovel ? "Edit Reading Log / Review" : "Select Graphic Novel to Log"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#9B9B9B] hover:text-white"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!selectedNovel ? (
          <div className="p-4 space-y-3 overflow-y-auto">
            <div className="relative">
              <Search className="w-4 h-4 text-[#9B9B9B] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search Watchmen, Akira, Persepolis, or any title..."
                className="pl-9 h-9 bg-[#121212] border-[#333333] text-xs"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#9B9B9B]">
                <span>{searchQuery ? "Matches" : "Top Ranked Entries"}</span>
                {searching && <span>Searching Open Library...</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
                {pickerResults.map((novel) => (
                  <button
                    key={novel.id}
                    type="button"
                    onClick={() => handleSelectNovel(novel)}
                    className="flex items-center gap-3 p-2 border border-[#2C2C2C] bg-[#141414] hover:border-[#4C74D6] hover:bg-[#1E2430] text-left transition-colors"
                  >
                    <div className="w-10 h-14 shrink-0 overflow-hidden bg-[#222222] border border-[#333333]">
                      {novel.coverUrl && (
                        <img
                          src={novel.coverUrl}
                          alt={novel.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate text-[#8EB4FF]">
                        {novel.title}
                      </p>
                      <p className="text-[11px] text-[#9B9B9B] truncate">
                        {novel.writers[0]}
                        {novel.year ? ` · ${novel.year}` : ""}
                      </p>
                      <span className="inline-block mt-0.5 text-[10px] text-[#CCCCCC]">
                        {novel.format}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto text-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-[#2C2C2C]">
              <div className="w-12 h-18 shrink-0 overflow-hidden bg-[#222222] border border-[#333333]">
                {selectedNovel.coverUrl && (
                  <img
                    src={selectedNovel.coverUrl}
                    alt={selectedNovel.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base text-white truncate">
                  {selectedNovel.title}
                </h3>
                <p className="text-xs text-[#9B9B9B]">
                  {selectedNovel.writers.join(", ")}
                  {selectedNovel.year ? ` · ${selectedNovel.year}` : ""}
                </p>
                {!initialNovel && (
                  <button
                    type="button"
                    onClick={() => setSelectedNovel(null)}
                    className="mt-1 text-[11px] mal-link"
                  >
                    Change title
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#9B9B9B]">
                  Date Logged
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 bg-[#121212] border-[#333333] text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#9B9B9B]">
                  Edition Format
                </label>
                <select
                  value={edition}
                  onChange={(e) => setEdition(e.target.value as EditionFormat)}
                  className="w-full h-8 rounded-[3px] border border-[#333333] bg-[#121212] px-2 text-xs text-white focus:outline-none focus:border-[#4C74D6]"
                >
                  {EDITIONS.map((ed) => (
                    <option key={ed} value={ed}>
                      {ed}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#9B9B9B]">
                Shelf Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-[3px] text-xs font-medium border transition-colors",
                      status === opt.value
                        ? opt.badgeClass
                        : "border-[#333333] bg-[#141414] text-[#9B9B9B] hover:text-white"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[#2C2C2C] bg-[#141414] p-3">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-[#9B9B9B] block">
                  Your Score (1–10)
                </span>
                <StarRating value={rating} onChange={(val) => setRating(val)} />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLiked(!liked)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] border text-xs font-medium",
                    liked
                      ? "bg-[#FB7185]/15 border-[#FB7185]/40 text-[#FB7185]"
                      : "bg-[#1C1C1C] border-[#333333] text-[#9B9B9B] hover:text-white"
                  )}
                >
                  <Heart className={cn("w-3.5 h-3.5", liked && "fill-[#FB7185]")} />
                  {liked ? "Favorited" : "Favorite"}
                </button>

                <button
                  type="button"
                  onClick={() => setReread(!reread)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] border text-xs font-medium",
                    reread
                      ? "bg-[#2E51A2]/30 border-[#4C74D6]/50 text-[#8EB4FF]"
                      : "bg-[#1C1C1C] border-[#333333] text-[#9B9B9B] hover:text-white"
                  )}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Re-read
                </button>
              </div>
            </div>

            {selectedNovel.issues && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#9B9B9B] font-semibold">
                  Issues / Volumes Read
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={selectedNovel.issues}
                    value={issuesRead}
                    onChange={(e) =>
                      setIssuesRead(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-16 h-7 text-center rounded-[3px] bg-[#121212] border-[#333333] text-xs tabular-nums"
                  />
                  <span className="text-[#9B9B9B] tabular-nums">
                    / {selectedNovel.issues}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[#9B9B9B]">
                  Review / Notes
                </label>
                <button
                  type="button"
                  onClick={() => setSpoiler(!spoiler)}
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px]",
                    spoiler ? "text-[#FACC15]" : "text-[#9B9B9B] hover:text-white"
                  )}
                >
                  <EyeOff className="w-3 h-3" />
                  {spoiler ? "Contains spoilers" : "Mark spoilers"}
                </button>
              </div>
              <textarea
                rows={4}
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Write a review or reading note..."
                className="w-full rounded-[3px] border border-[#333333] bg-[#121212] p-2.5 text-xs text-white placeholder:text-[#666666] focus:outline-none focus:border-[#4C74D6] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2C2C2C]">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <button
                type="submit"
                className="h-8 px-4 rounded-[3px] bg-[#2E51A2] hover:bg-[#3A62BE] text-white font-semibold"
              >
                Save Entry
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
