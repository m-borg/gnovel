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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Library backup and data settings"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-base">Local Archive & Backup</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            GNovel runs 100% client-side with zero accounts or tracking. Your shelf,
            half-star ratings, diary reviews, and lists live in your browser&apos;s{" "}
            <code className="text-foreground font-mono">localStorage</code>. Export a
            JSON snapshot anytime to move devices or keep a backup.
          </p>

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/50 border border-white/5 p-3 text-center">
            <div>
              <div className="text-lg font-bold font-mono text-foreground">{totalBooks}</div>
              <div className="text-[11px] text-muted-foreground">Tracked</div>
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-foreground">{totalLogs}</div>
              <div className="text-[11px] text-muted-foreground">Diary Logs</div>
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-foreground">{totalLists}</div>
              <div className="text-[11px] text-muted-foreground">Lists</div>
            </div>
          </div>

          <div className="space-y-2.5">
            <Button
              type="button"
              onClick={handleDownload}
              className="w-full justify-start gap-2.5 h-10 bg-secondary hover:bg-secondary/80 text-foreground border border-white/10"
            >
              <Download className="w-4 h-4 text-primary" />
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
              className="w-full justify-start gap-2.5 h-10 bg-secondary hover:bg-secondary/80 text-foreground border border-white/10"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              Import Backup (.json)
            </Button>

            <Button
              type="button"
              onClick={() => {
                loadStarterShelf();
                setFeedback({ type: "ok", msg: "Sample shelf, diary & list loaded!" });
              }}
              className="w-full justify-start gap-2.5 h-10 bg-secondary hover:bg-secondary/80 text-foreground border border-white/10"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Load Sample Shelf & Diary
            </Button>
          </div>

          {feedback && (
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                feedback.type === "ok"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                  : "bg-destructive/15 text-red-300 border border-destructive/20"
              }`}
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{feedback.msg}</span>
            </div>
          )}

          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset local data
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-400">Erase all logs?</span>
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

            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
