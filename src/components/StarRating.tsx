"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number; // 0 to 5 in 0.5 increments
  onChange?: (next: number) => void;
  size?: "xs" | "sm" | "md" | "lg";
  readonly?: boolean;
  showLabel?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const RATING_LABELS: Record<number, string> = {
  0.5: "Disaster",
  1: "Weak",
  1.5: "Flawed",
  2: "Mediocre",
  2.5: "Decent",
  3: "Good",
  3.5: "Very Good",
  4: "Great",
  4.5: "Superb",
  5: "Masterpiece",
};

export function StarRating({
  value,
  onChange,
  size = "md",
  readonly = false,
  showLabel = false,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value;
  const iconSize = SIZE_MAP[size];

  if (readonly) {
    return (
      <div className={cn("inline-flex items-center gap-0.5", className)} aria-label={`Rated ${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => {
          const full = displayValue >= star;
          const half = !full && displayValue >= star - 0.5;
          return (
            <span key={star} className="relative inline-flex">
              <Star className={cn(iconSize, "text-white/15 fill-white/5")} />
              {(full || half) && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: full ? "100%" : "50%" }}
                >
                  <Star className={cn(iconSize, "text-primary fill-primary")} />
                </span>
              )}
            </span>
          );
        })}
        {showLabel && value > 0 && (
          <span className="ml-1.5 text-xs font-mono text-muted-foreground">
            {value.toFixed(1)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div
        className="inline-flex items-center gap-1"
        onMouseLeave={() => setHoverValue(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const full = displayValue >= star;
          const half = !full && displayValue >= star - 0.5;
          return (
            <div key={star} className="relative inline-flex cursor-pointer select-none">
              <Star className={cn(iconSize, "text-white/15 fill-white/5 transition-transform")} />
              {(full || half) && (
                <span
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  style={{ width: full ? "100%" : "50%" }}
                >
                  <Star className={cn(iconSize, "text-primary fill-primary")} />
                </span>
              )}
              <button
                type="button"
                aria-label={`Rate ${star - 0.5} stars`}
                className="absolute inset-y-0 left-0 w-1/2 focus:outline-none"
                onMouseEnter={() => setHoverValue(star - 0.5)}
                onClick={() => onChange?.(star - 0.5)}
              />
              <button
                type="button"
                aria-label={`Rate ${star} stars`}
                className="absolute inset-y-0 right-0 w-1/2 focus:outline-none"
                onMouseEnter={() => setHoverValue(star)}
                onClick={() => onChange?.(star)}
              />
            </div>
          );
        })}
      </div>

      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground min-w-[80px]">
          {displayValue > 0 ? (
            <>
              <span className="text-primary font-mono font-semibold">{displayValue.toFixed(1)}</span>{" "}
              · {RATING_LABELS[displayValue] || ""}
            </>
          ) : (
            "Tap to rate"
          )}
        </span>
      )}
    </div>
  );
}
