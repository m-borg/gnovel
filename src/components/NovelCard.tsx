"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, Check, Heart, Plus, Star } from "lucide-react";
import { StarRating } from "./StarRating";
import { cacheNovelSnapshot } from "@/lib/openlibrary";
import { getStatusMeta } from "@/lib/status";
import { useGNovel } from "@/lib/storage";
import type { GraphicNovel } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NovelCardProps {
  novel: GraphicNovel;
  onLogClick?: (novel: GraphicNovel) => void;
  rank?: number;
}

export function getNovelHref(novel: GraphicNovel): string {
  if (novel.isCurated) {
    return `/novel/?id=${encodeURIComponent(novel.id)}`;
  }
  const ol = novel.olKey || novel.id.replace(/^ol-/, "");
  return `/novel/?ol=${encodeURIComponent(ol)}`;
}

export function NovelCard({ novel, onLogClick, rank }: NovelCardProps) {
  const { getEntry, setStatus, toggleLike } = useGNovel();
  const [imgError, setImgError] = useState(false);

  const entry = getEntry(novel.id);
  const statusMeta = entry?.status ? getStatusMeta(entry.status) : undefined;
  const href = getNovelHref(novel);

  return (
    <div className="group relative flex flex-col">
      <Link
        href={href}
        onClick={() => cacheNovelSnapshot(novel)}
        className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-secondary ring-1 ring-white/10 transition-all duration-200 group-hover:-translate-y-1 group-hover:ring-primary/50 group-hover:shadow-[0_14px_30px_-10px_rgba(0,0,0,0.75)]"
      >
        {novel.coverUrl && !imgError ? (
          <img
            src={novel.coverUrl}
            alt={novel.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-slate-800 via-slate-900 to-zinc-950 p-3.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary/80">
              {novel.format}
            </span>
            <div>
              <p className="font-serif text-base leading-snug text-foreground line-clamp-3">
                {novel.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                {novel.writers[0]}
              </p>
            </div>
          </div>
        )}

        {/* Rank pill for ranked lists */}
        {rank !== undefined && (
          <div className="absolute top-2 left-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-md bg-black/80 px-1.5 font-mono text-xs font-bold text-primary ring-1 ring-white/15 backdrop-blur-sm">
            #{rank}
          </div>
        )}

        {/* Status badge top-left (or top-right if ranked) */}
        {statusMeta && (
          <div
            className={cn(
              "absolute top-2 z-10 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md",
              rank !== undefined ? "right-2" : "left-2",
              statusMeta.badgeClass
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dotClass)} />
            {statusMeta.shortLabel}
          </div>
        )}

        {/* Liked badge top-right when not hovered */}
        {entry?.liked && rank === undefined && (
          <div className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-rose-400 backdrop-blur-sm ring-1 ring-white/10">
            <Heart className="h-3 w-3 fill-rose-400" />
          </div>
        )}

        {/* Letterboxd-style hover quick-action dock */}
        <div
          className="absolute inset-x-2 bottom-2 z-20 flex items-center justify-between gap-1 rounded-lg bg-black/80 p-1 opacity-0 backdrop-blur-md ring-1 ring-white/15 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            type="button"
            title={entry?.status === "completed" ? "Completed" : "Mark Completed"}
            onClick={() => setStatus(novel, "completed")}
            className={cn(
              "flex flex-1 items-center justify-center rounded-md py-1.5 transition-colors",
              entry?.status === "completed"
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            )}
          >
            <Check className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title={entry?.liked ? "Unlike" : "Like"}
            onClick={() => toggleLike(novel)}
            className={cn(
              "flex flex-1 items-center justify-center rounded-md py-1.5 transition-colors",
              entry?.liked
                ? "bg-rose-500/20 text-rose-400"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", entry?.liked && "fill-rose-400")} />
          </button>

          <button
            type="button"
            title={entry?.status === "plan" ? "In Backlog" : "Add to Backlog"}
            onClick={() => setStatus(novel, "plan")}
            className={cn(
              "flex flex-1 items-center justify-center rounded-md py-1.5 transition-colors",
              entry?.status === "plan"
                ? "bg-amber-500/20 text-amber-400"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            )}
          >
            <Bookmark className={cn("h-3.5 w-3.5", entry?.status === "plan" && "fill-amber-400")} />
          </button>

          {onLogClick && (
            <button
              type="button"
              title="Log & Review"
              onClick={() => onLogClick(novel)}
              className="flex flex-1 items-center justify-center rounded-md py-1.5 text-slate-300 hover:bg-primary/20 hover:text-primary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </Link>

      {/* Metadata footer */}
      <div className="mt-2.5 space-y-1">
        <Link
          href={href}
          onClick={() => cacheNovelSnapshot(novel)}
          className="block font-medium text-sm leading-snug text-foreground line-clamp-1 group-hover:text-primary transition-colors"
        >
          {novel.title}
        </Link>

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {novel.writers[0]}
            {novel.year ? ` · ${novel.year}` : ""}
          </span>

          {entry && entry.rating > 0 ? (
            <StarRating value={entry.rating} readonly size="xs" className="shrink-0" />
          ) : (
            <span className="inline-flex items-center gap-0.5 font-mono text-[11px] text-muted-foreground/80 shrink-0">
              <Star className="h-3 w-3 fill-primary/70 text-primary/70" />
              {novel.communityScore.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
