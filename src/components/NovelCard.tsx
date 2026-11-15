"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, Check, Heart, Plus, Star } from "lucide-react";
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
        className="relative aspect-[2/3] w-full overflow-hidden border border-[#2C2C2C] bg-[#1C1C1C] transition-colors group-hover:border-[#4C74D6]"
      >
        {novel.coverUrl && !imgError ? (
          <img
            src={novel.coverUrl}
            alt={novel.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between bg-[#1A1A1A] p-3">
            <span className="text-[10px] font-mono uppercase text-[#8EB4FF]">
              {novel.format}
            </span>
            <div>
              <p className="font-bold text-xs leading-snug text-white line-clamp-3">
                {novel.title}
              </p>
              <p className="mt-1 text-[11px] text-[#9B9B9B] line-clamp-1">
                {novel.writers[0]}
              </p>
            </div>
          </div>
        )}

        {/* Top-left rank or score */}
        {rank !== undefined ? (
          <div className="absolute top-1.5 left-1.5 bg-[#2E51A2] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white shadow">
            #{rank}
          </div>
        ) : null}

        {/* Status badge */}
        {statusMeta && (
          <div
            className={cn(
              "absolute top-1.5 right-1.5 flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-bold bg-black/85",
              statusMeta.badgeClass
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dotClass)} />
            {statusMeta.shortLabel}
          </div>
        )}

        {/* Quick action bar */}
        <div
          className="absolute inset-x-1.5 bottom-1.5 z-20 flex items-center justify-between gap-1 bg-black/85 p-1 opacity-0 border border-[#333333] transition-opacity group-hover:opacity-100 focus-within:opacity-100"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            type="button"
            title="Mark Completed"
            onClick={() => setStatus(novel, "completed")}
            className={cn(
              "flex flex-1 items-center justify-center py-1 rounded-[2px]",
              entry?.status === "completed"
                ? "bg-[#2E51A2] text-white"
                : "text-[#CCCCCC] hover:bg-white/10"
            )}
          >
            <Check className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Favorite"
            onClick={() => toggleLike(novel)}
            className={cn(
              "flex flex-1 items-center justify-center py-1 rounded-[2px]",
              entry?.liked
                ? "bg-[#FB7185]/20 text-[#FB7185]"
                : "text-[#CCCCCC] hover:bg-white/10"
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", entry?.liked && "fill-[#FB7185]")} />
          </button>

          <button
            type="button"
            title="Plan to Read"
            onClick={() => setStatus(novel, "plan")}
            className={cn(
              "flex flex-1 items-center justify-center py-1 rounded-[2px]",
              entry?.status === "plan"
                ? "bg-[#757575]/30 text-white"
                : "text-[#CCCCCC] hover:bg-white/10"
            )}
          >
            <Bookmark className="h-3.5 w-3.5" />
          </button>

          {onLogClick && (
            <button
              type="button"
              title="Log / Review"
              onClick={() => onLogClick(novel)}
              className="flex flex-1 items-center justify-center py-1 rounded-[2px] text-[#8EB4FF] hover:bg-[#2E51A2]/40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </Link>

      <div className="mt-1.5 space-y-0.5">
        <Link
          href={href}
          onClick={() => cacheNovelSnapshot(novel)}
          className="block font-semibold text-xs leading-snug mal-link line-clamp-1"
        >
          {novel.title}
        </Link>

        <div className="flex items-center justify-between gap-2 text-[11px] text-[#9B9B9B]">
          <span className="truncate">
            {novel.writers[0]}
            {novel.year ? ` · ${novel.year}` : ""}
          </span>

          <span className="inline-flex items-center gap-0.5 font-mono text-[11px] text-[#FACC15] shrink-0">
            <Star className="h-3 w-3 fill-[#FACC15] text-[#FACC15]" />
            {entry && entry.rating > 0 ? `${entry.rating}/10` : novel.communityScore.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
