import type { ReadingStatus } from "./types";

export interface StatusMeta {
  value: Exclude<ReadingStatus, "none">;
  label: string;
  shortLabel: string;
  stripColor: string;
  badgeClass: string;
  dotClass: string;
}

export const STATUS_OPTIONS: StatusMeta[] = [
  {
    value: "reading",
    label: "Reading",
    shortLabel: "Reading",
    stripColor: "bg-[#2DB039]",
    badgeClass: "bg-[#2DB039]/15 text-[#4ADE80] border-[#2DB039]/40",
    dotClass: "bg-[#2DB039]",
  },
  {
    value: "completed",
    label: "Completed",
    shortLabel: "Completed",
    stripColor: "bg-[#2E51A2]",
    badgeClass: "bg-[#2E51A2]/25 text-[#8EB4FF] border-[#4C74D6]/50",
    dotClass: "bg-[#4C74D6]",
  },
  {
    value: "on_hold",
    label: "On-Hold",
    shortLabel: "On-Hold",
    stripColor: "bg-[#E7B715]",
    badgeClass: "bg-[#E7B715]/15 text-[#FACC15] border-[#E7B715]/40",
    dotClass: "bg-[#E7B715]",
  },
  {
    value: "dropped",
    label: "Dropped",
    shortLabel: "Dropped",
    stripColor: "bg-[#A12F31]",
    badgeClass: "bg-[#A12F31]/20 text-[#F87171] border-[#A12F31]/50",
    dotClass: "bg-[#EF4444]",
  },
  {
    value: "plan",
    label: "Plan to Read",
    shortLabel: "PTW",
    stripColor: "bg-[#757575]",
    badgeClass: "bg-[#757575]/20 text-[#CCCCCC] border-[#757575]/40",
    dotClass: "bg-[#9CA3AF]",
  },
];

export const MAL_SCORE_LABELS: Record<number, string> = {
  10: "(10) Masterpiece",
  9: "(9) Great",
  8: "(8) Very Good",
  7: "(7) Good",
  6: "(6) Fine",
  5: "(5) Average",
  4: "(4) Bad",
  3: "(3) Very Bad",
  2: "(2) Horrible",
  1: "(1) Appalling",
};

export function getStatusMeta(status: ReadingStatus): StatusMeta | undefined {
  return STATUS_OPTIONS.find((s) => s.value === status);
}
