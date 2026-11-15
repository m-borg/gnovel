"use client";

import { useRef, useState } from "react";
import { X, Download, Upload, Sparkles, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGNovel } from "@/lib/storage";

interface BackupModalProps {
  open: boolean;
  onClose: () => void;
}

export function BackupModal({ open, onClose }: BackupModalProps) {
  const { state, exportJson, importJson, loadStarterShelf, clearAllData } = useGNovel();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!open) return null;

  const totalBooks = Object.keys(state.library).length;
  const totalLogs = state.diary.length;
  const totalLists = state.lists.length;

  const handleDownload = () => {
    const json = exportJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gnovel-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({ type: "ok", msg: "Backup downloaded." });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = importJson(text);
    if (res.ok) {
      setFeedback({ type: "ok", msg: "Library and diary restored!" });
    } else {
      setFeedback({ type: "err", msg: res.error || "Import failed." });
    }
    e.target.value = "";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Library backup and data settings"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md border border-[#333333] bg-[#181818] shadow-2xl overflow-hidden text-xs">
        <div className="flex items-center justify-between border-b border-[#2C2C2C] bg-[#222222] px-4 py-3">
          <h2 className="font-bold text-sm text-white">Local Archive &amp; Backup</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#9B9B9B] hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-[#9B9B9B] leading-relaxed">
            GNovel runs 100% client-side with zero accounts. Your shelf, 1–10 scores,
            diary reviews, and custom reader links are saved in{" "}
            <code className="text-white font-mono">localStorage</code>. Export a JSON
            snapshot anytime.
          </p>

          <div className="grid grid-cols-3 gap-2 border border-[#2A2A2A] bg-[#121212] p-2.5 text-center">
            <div>
              <div className="text-base font-bold font-mono text-white">{totalBooks}</div>
              <div className="text-[10px] text-[#9B9B9B]">Tracked</div>
            </div>
            <div>
              <div className="text-base font-bold font-mono text-white">{totalLogs}</div>
              <div className="text-[10px] text-[#9B9B9B]">Diary Logs</div>
            </div>
            <div>
              <div className="text-base font-bold font-mono text-white">{totalLists}</div>
              <div className="text-[10px] text-[#9B9B9B]">Lists</div>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              onClick={handleDownload}
              className="w-full justify-start gap-2 h-8 bg-[#222222] hover:bg-[#2A2A2A] text-white border border-[#333333] text-xs"
            >
              <Download className="h-3.5 w-3.5 text-[#8EB4FF]" />
              Export Backup (.json)
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full justify-start gap-2 h-8 bg-[#222222] hover:bg-[#2A2A2A] text-white border border-[#333333] text-xs"
            >
              <Upload className="h-3.5 w-3.5 text-[#8EB4FF]" />
              Import Backup (.json)
            </Button>

            <Button
              type="button"
              onClick={() => {
                loadStarterShelf();
                setFeedback({ type: "ok", msg: "Sample shelf, diary & list loaded!" });
              }}
              className="w-full justify-start gap-2 h-8 bg-[#222222] hover:bg-[#2A2A2A] text-white border border-[#333333] text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#4ADE80]" />
              Load Sample Shelf &amp; Diary
            </Button>
          </div>

          {feedback && (
            <div
              className={`flex items-center gap-2 px-2.5 py-2 text-xs border ${
                feedback.type === "ok"
                  ? "bg-[#2DB039]/15 text-[#4ADE80] border-[#2DB039]/30"
                  : "bg-[#A12F31]/20 text-[#F87171] border-[#A12F31]/40"
              }`}
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{feedback.msg}</span>
            </div>
          )}

          <div className="pt-3 border-t border-[#2A2A2A] flex items-center justify-between">
            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1 text-[11px] text-[#9B9B9B] hover:text-[#FB7185]"
              >
                <Trash2 className="w-3 h-3" />
                Reset local data
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#FB7185]">Erase all?</span>
                <Button
                  type="button"
                  size="xs"
                  variant="destructive"
                  onClick={() => {
                    clearAllData();
                    setConfirmClear(false);
                    setFeedback({ type: "ok", msg: "Local archive cleared." });
                  }}
                >
                  Confirm
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </Button>
              </div>
            )}

            <Button type="button" size="xs" variant="ghost" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
