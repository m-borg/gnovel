"use client";

import Link from "next/link";
import { getCreatorHref } from "@/lib/openlibrary";
import { cn } from "@/lib/utils";

interface CreatorLinksProps {
  names: string[];
  className?: string;
  linkClassName?: string;
  max?: number;
}

export function CreatorLinks({
  names,
  className,
  linkClassName,
  max,
}: CreatorLinksProps) {
  const clean = names.filter(Boolean);
  const shown = max ? clean.slice(0, max) : clean;

  if (shown.length === 0) return null;

  return (
    <span className={cn("inline", className)}>
      {shown.map((name, idx) => (
        <span key={`${name}-${idx}`}>
          {idx > 0 && ", "}
          <Link
            href={getCreatorHref(name)}
            onClick={(e) => e.stopPropagation()}
            className={cn("mal-link hover:underline", linkClassName)}
          >
            {name}
          </Link>
        </span>
      ))}
      {max && clean.length > max && (
        <span className="text-[#7F7F7F]"> +{clean.length - max}</span>
      )}
    </span>
  );
}
