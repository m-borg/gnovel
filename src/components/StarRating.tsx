"use client";

import { Star } from "lucide-react";
import { MAL_SCORE_LABELS } from "@/lib/status";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number; // 0 = unscored, 1..10 MAL scale
  onChange?: (next: number) => void;
  readonly?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: "w-3 h-3",
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "sm",
  showLabel = false,
  className,
}: StarRatingProps) {
  const iconSize = SIZE_MAP[size];

  if (readonly) {
    if (!value) {
      return (
        <span className={cn("text-xs text-muted-foreground font-mono", className)}>
          —
        </span>
      );
    }
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#FACC15]",
          className
        )}
      >
        <Star className={cn(iconSize, "fill-[#FACC15] text-[#FACC15]")} />
        <span>{value}</span>
        {showLabel && (
          <span className="font-sans font-normal text-muted-foreground text-[11px]">
            / 10
          </span>
        )}
      </span>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <Star
        className={cn(
          iconSize,
          value > 0
            ? "fill-[#FACC15] text-[#FACC15]"
            : "text-muted-foreground"
        )}
      />
      <select
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        aria-label="Your Score"
        className="h-7 rounded border border-[#3a3a3a] bg-[#1e1e1e] px-2 text-xs text-foreground focus:outline-none focus:border-[#4c74d6]"
      >
        <option value={0}>Select Score</option>
        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {MAL_SCORE_LABELS[n]}
          </option>
        ))}
      </select>
    </div>
  );
}
