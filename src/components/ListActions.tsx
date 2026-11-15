"use client";

import { useState } from "react";
import {
  BookmarkPlus,
  Check,
  Heart,
  ListPlus,
  Minus,
  NotebookPen,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "./StarRating";
import { LogModal } from "./LogModal";
import { STATUS_OPTIONS } from "@/lib/status";
import { useGNovel } from "@/lib/storage";
import type { GraphicNovel } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ListActionsProps {
  novel: GraphicNovel;
}

export function ListActions({ novel }: ListActionsProps) {
  const {
    state,
    mounted,
    getEntry,
    setStatus,
    setRating,
    toggleLike,
    setProgress,
    createList,
    toggleNovelInList,
  } = useGNovel();

  const [logOpen, setLogOpen] = useState(false);
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-white/10 bg-card p-4 h-64 animate-pulse" />
    );
  }

  const entry = getEntry(novel.id);
  const currentStatus = entry?.status || "none";
  const currentRating = entry?.rating || 0;
  const liked = entry?.liked || false;
  const issuesRead = entry?.issuesRead || 0;
  const totalIssues = novel.issues || 0;
  const progressPct =
    totalIssues > 0 ? Math.min(100, Math.round((issuesRead / totalIssues) * 100)) : 0;

  const handleCreateQuickList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const created = createList(newListName.trim(), "", false);
    toggleNovelInList(created.id, novel);
    setNewListName("");
  };

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-card p-4 space-y-5 shadow-lg">
        {/* Status Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Shelf Status
            </span>
            <button
              type="button"
              onClick={() => toggleLike(novel)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border",
                liked
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                  : "bg-secondary/50 border-white/10 text-muted-foreground hover:text-foreground"
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", liked && "fill-rose-400")} />
              {liked ? "Liked" : "Like"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {STATUS_OPTIONS.map((opt) => {
              const active = currentStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(novel, opt.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all",
                    opt.value === "completed" && "col-span-2",
                    active
                      ? opt.badgeClass
                      : "border-white/10 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      active ? opt.dotClass : "bg-white/25"
                    )}
                  />
                  <span className="truncate">{opt.label}</span>
                  {active && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Half-star Rating */}
        <div className="space-y-2 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your Rating
            </span>
            {currentRating > 0 && (
              <button
                type="button"
                onClick={() => setRating(novel, currentRating)}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <StarRating
            value={currentRating}
            onChange={(val) => setRating(novel, val)}
            size="md"
            showLabel
          />
        </div>

        {/* Issue / Volume Progress */}
        <div className="space-y-2 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {novel.issues ? "Issues Read" : "Volumes / Chapters"}
            </span>
            {totalIssues > 0 && (
              <span className="text-[11px] font-mono text-muted-foreground">
                {progressPct}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProgress(novel, Math.max(0, issuesRead - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-secondary/60 text-muted-foreground hover:text-foreground"
              aria-label="Decrease progress"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <Input
              type="number"
              min={0}
              max={totalIssues || undefined}
              value={issuesRead}
              onChange={(e) =>
                setProgress(novel, Math.max(0, parseInt(e.target.value, 10) || 0))
              }
              className="h-8 text-center font-mono bg-secondary/60 border-white/10"
            />
            <button
              type="button"
              onClick={() =>
                setProgress(
                  novel,
                  totalIssues ? Math.min(totalIssues, issuesRead + 1) : issuesRead + 1
                )
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-secondary/60 text-muted-foreground hover:text-foreground"
              aria-label="Increase progress"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-mono text-muted-foreground shrink-0">
              / {totalIssues || "?"}
            </span>
          </div>

          {totalIssues > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Diary & List CTAs */}
        <div className="space-y-2 pt-3 border-t border-white/10">
          <Button
            type="button"
            onClick={() => setLogOpen(true)}
            className="w-full h-9 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold gap-2"
          >
            <NotebookPen className="h-4 w-4" />
            Log or Review in Diary
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setListPickerOpen(!listPickerOpen)}
            className="w-full h-9 justify-between border border-white/10"
          >
            <span className="inline-flex items-center gap-2">
              <ListPlus className="h-4 w-4 text-primary" />
              Add to Custom List
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {
                state.lists.filter((l) => l.items.some((i) => i.novelId === novel.id))
                  .length
              }
            </span>
          </Button>

          {listPickerOpen && (
            <div className="rounded-xl border border-white/10 bg-secondary/70 p-2.5 space-y-2">
              {state.lists.length > 0 ? (
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {state.lists.map((list) => {
                    const included = list.items.some((i) => i.novelId === novel.id);
                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => toggleNovelInList(list.id, novel)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-white/10 text-left transition-colors"
                      >
                        <span className="truncate">{list.title}</span>
                        {included ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <BookmarkPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground px-1">
                  No lists yet — create one below.
                </p>
              )}

              <form onSubmit={handleCreateQuickList} className="flex gap-1.5 pt-1 border-t border-white/10">
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="New list name..."
                  className="h-7 text-xs bg-background/60 border-white/10"
                />
                <Button type="submit" size="xs" className="shrink-0">
                  Add
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      <LogModal open={logOpen} onClose={() => setLogOpen(false)} initialNovel={novel} />
    </>
  );
}
