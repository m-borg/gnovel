"use client";

import { useState } from "react";
import {
  BookmarkPlus,
  Check,
  ExternalLink,
  Heart,
  Link2,
  ListPlus,
  NotebookPen,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { LogModal } from "./LogModal";
import { MAL_SCORE_LABELS, STATUS_OPTIONS } from "@/lib/status";
import { useGNovel } from "@/lib/storage";
import type { GraphicNovel, ReadingStatus } from "@/lib/types";
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
    setCustomUrl,
    createList,
    toggleNovelInList,
  } = useGNovel();

  const [logOpen, setLogOpen] = useState(false);
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingLink, setEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  if (!mounted) {
    return (
      <div className="rounded-[4px] border border-[#2C2C2C] bg-[#181818] p-3 h-48 animate-pulse" />
    );
  }

  const entry = getEntry(novel.id);
  const currentStatus = entry?.status || "none";
  const currentRating = entry?.rating || 0;
  const liked = entry?.liked || false;
  const issuesRead = entry?.issuesRead || 0;
  const totalIssues = novel.issues || 0;
  const savedUrl = entry?.customUrl || "";

  const handleStatusSelect = (val: string) => {
    if (val === "none") {
      if (currentStatus !== "none") setStatus(novel, currentStatus);
    } else {
      const target = val as Exclude<ReadingStatus, "none">;
      if (currentStatus !== target) {
        setStatus(novel, target);
      }
    }
  };

  const handleCreateQuickList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const created = createList(newListName.trim(), "", false);
    toggleNovelInList(created.id, novel);
    setNewListName("");
  };

  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomUrl(novel, linkDraft);
    setEditingLink(false);
  };

  return (
    <>
      <div className="space-y-2.5 text-xs">
        {/* MAL "Edit Status" Block */}
        <div className="rounded-[4px] border border-[#2C2C2C] bg-[#181818] p-2.5 space-y-2">
          <div className="border-b border-[#2C2C2C] pb-1 font-bold text-[#E5E5E5]">
            Edit Status
          </div>

          <p className="text-[11px] text-[#D86C6C]">
            * Your list is saved locally.
          </p>

          <div className="space-y-2">
            {/* Status Row */}
            <div className="grid grid-cols-[74px_1fr] items-center gap-2">
              <label className="text-[#B0B0B0]">Status:</label>
              <select
                value={currentStatus}
                onChange={(e) => handleStatusSelect(e.target.value)}
                className="h-7 w-full rounded-[3px] border border-[#3A3A3A] bg-[#1D1D1D] px-2 text-xs text-white focus:outline-none focus:border-[#4C74D6]"
              >
                <option value="none">Add to Shelf</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Issues Read Row */}
            <div className="grid grid-cols-[74px_1fr] items-center gap-2">
              <label className="text-[#B0B0B0]">Issues Read:</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={totalIssues || undefined}
                  value={issuesRead}
                  onChange={(e) =>
                    setProgress(novel, Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="h-7 w-14 rounded-[3px] border border-[#3A3A3A] bg-[#1D1D1D] px-1.5 text-center text-xs text-white tabular-nums focus:outline-none focus:border-[#4C74D6]"
                />
                <span className="text-[#B0B0B0] tabular-nums">
                  / {totalIssues || "?"}
                </span>
                <button
                  type="button"
                  title="Increment +1"
                  onClick={() =>
                    setProgress(
                      novel,
                      totalIssues ? Math.min(totalIssues, issuesRead + 1) : issuesRead + 1
                    )
                  }
                  className="ml-auto flex h-6 w-6 items-center justify-center rounded-[3px] border border-[#3A3A3A] bg-[#242424] text-[#CCCCCC] hover:bg-[#2E51A2] hover:text-white transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>

            {novel.volumes && (
              <div className="grid grid-cols-[74px_1fr] items-center gap-2">
                <span className="text-[#B0B0B0]">Volumes:</span>
                <span className="text-[#E5E5E5] tabular-nums">{novel.volumes}</span>
              </div>
            )}

            {/* Your Score Row */}
            <div className="grid grid-cols-[74px_1fr] items-center gap-2">
              <label className="text-[#B0B0B0]">Your Score:</label>
              <select
                value={currentRating}
                onChange={(e) => setRating(novel, Number(e.target.value))}
                className="h-7 w-full rounded-[3px] border border-[#3A3A3A] bg-[#1D1D1D] px-2 text-xs text-white focus:outline-none focus:border-[#4C74D6]"
              >
                <option value={0}>Select</option>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {MAL_SCORE_LABELS[n]}
                  </option>
                ))}
              </select>
            </div>

            {/* MAL Submit / Update + Edit Details Row */}
            <div className="grid grid-cols-[74px_1fr] items-center gap-2 pt-0.5">
              <span />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (currentStatus === "none") {
                      setStatus(novel, "plan");
                    }
                    setSavedNotice(true);
                    setTimeout(() => setSavedNotice(false), 1600);
                  }}
                  className="h-6 rounded-[3px] bg-[#4065BA] hover:bg-[#4E77D4] px-2.5 text-[11px] font-bold text-white transition-colors"
                >
                  {savedNotice
                    ? "Saved!"
                    : currentStatus === "none"
                    ? "Submit"
                    : "Update"}
                </button>
                <button
                  type="button"
                  onClick={() => setLogOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] mal-link"
                >
                  <NotebookPen className="h-3 w-3" />
                  Edit Details
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MAL Text-Link Actions (Favorites, Lists, Reader Link) */}
        <div className="border-y border-[#2A2A2A] divide-y divide-[#252525]">
          <button
            type="button"
            onClick={() => toggleLike(novel)}
            className="flex w-full items-center justify-between py-2 px-1 text-left mal-link"
          >
            <span className="inline-flex items-center gap-1.5">
              <Heart
                className={cn(
                  "h-3.5 w-3.5",
                  liked ? "fill-[#FB7185] text-[#FB7185]" : "text-[#8EB4FF]"
                )}
              />
              {liked ? "Remove from Favorites" : "Add to Favorites"}
            </span>
          </button>

          <div>
            <button
              type="button"
              onClick={() => setListPickerOpen(!listPickerOpen)}
              className="flex w-full items-center justify-between py-2 px-1 text-left mal-link"
            >
              <span className="inline-flex items-center gap-1.5">
                <ListPlus className="h-3.5 w-3.5" />
                Add to Custom List
              </span>
              <span className="font-mono text-[11px] text-[#9B9B9B]">
                (
                {
                  state.lists.filter((l) => l.items.some((i) => i.novelId === novel.id))
                    .length
                }
                )
              </span>
            </button>

            {listPickerOpen && (
              <div className="mb-2 rounded border border-[#2E2E2E] bg-[#141414] p-2 space-y-2">
                {state.lists.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {state.lists.map((list) => {
                      const included = list.items.some((i) => i.novelId === novel.id);
                      return (
                        <button
                          key={list.id}
                          type="button"
                          onClick={() => toggleNovelInList(list.id, novel)}
                          className="flex w-full items-center justify-between rounded px-2 py-1 text-xs hover:bg-[#222222] text-left"
                        >
                          <span className="truncate text-[#E5E5E5]">{list.title}</span>
                          {included ? (
                            <Check className="h-3.5 w-3.5 text-[#4ADE80] shrink-0" />
                          ) : (
                            <BookmarkPlus className="h-3.5 w-3.5 text-[#9B9B9B] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#9B9B9B]">No lists yet.</p>
                )}

                <form onSubmit={handleCreateQuickList} className="flex gap-1">
                  <Input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="New list..."
                    className="h-7 text-xs bg-[#1C1C1C] border-[#333333]"
                  />
                  <button
                    type="submit"
                    className="px-2.5 h-7 rounded-[3px] bg-[#2E51A2] text-white text-xs font-semibold shrink-0"
                  >
                    Add
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="py-2 px-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[#9B9B9B]">
                <Link2 className="h-3.5 w-3.5" />
                Reader / Source Link
              </span>
              <button
                type="button"
                onClick={() => {
                  setLinkDraft(savedUrl);
                  setEditingLink(!editingLink);
                }}
                className="mal-link text-[11px]"
              >
                {editingLink ? "Cancel" : savedUrl ? "Edit" : "Attach URL"}
              </button>
            </div>

            {savedUrl && !editingLink && (
              <a
                href={savedUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] mal-link break-all"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                Open attached reader link
              </a>
            )}

            {editingLink && (
              <form onSubmit={handleSaveLink} className="flex gap-1 pt-1">
                <Input
                  type="url"
                  value={linkDraft}
                  onChange={(e) => setLinkDraft(e.target.value)}
                  placeholder="https://..."
                  className="h-7 text-xs bg-[#121212] border-[#3A3A3A]"
                />
                <button
                  type="submit"
                  className="px-2 h-7 rounded-[2px] bg-[#2E51A2] text-white text-xs font-semibold shrink-0"
                >
                  Save
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <LogModal open={logOpen} onClose={() => setLogOpen(false)} initialNovel={novel} />
    </>
  );
}
