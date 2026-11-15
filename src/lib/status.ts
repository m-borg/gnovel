import type { ReadingStatus } from "./types";

export interface StatusMeta {
  value: Exclude<ReadingStatus, "none">;
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotClass: string;
}

export const STATUS_OPTIONS: StatusMeta[] = [
  {
    value: "completed",
    label: "Completed",
    shortLabel: "Read",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dotClass: "bg-emerald-400",
  },
  {
    value: "reading",
    label: "Reading",
    shortLabel: "Reading",
    badgeClass: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    dotClass: "bg-sky-400",
  },
  {
    value: "plan",
    label: "Plan to Read",
    shortLabel: "Backlog",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-400",
  },
  {
    value: "on_hold",
    label: "On Hold",
    shortLabel: "Paused",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    dotClass: "bg-purple-400",
  },
  {
    value: "dropped",
    label: "Dropped",
    shortLabel: "Dropped",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    dotClass: "bg-rose-400",
  },
];

export function getStatusMeta(status: ReadingStatus): StatusMeta | undefined {
  return STATUS_OPTIONS.find((s) => s.value === status);
}
