"use client";

import Link from "next/link";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";

type Props = { saved: boolean; saving: boolean; onSave: () => void; compact?: boolean };

/** Save / Saving… / Saved → View my trips. `compact` is the secondary button beside a primary CTA. */
export default function SaveTripButton({ saved, saving, onSave, compact = false }: Props) {
  const base = "flex h-14 items-center justify-center gap-2 rounded-2xl font-semibold transition-transform active:scale-[0.98]";

  if (saved) {
    return (
      <Link
        href="/trips"
        className={`${base} ${compact ? "bg-leaf-soft px-4 text-leaf-deep ring-1 ring-leaf/40" : "w-full bg-leaf-deep text-white shadow-float"}`}
      >
        <BookmarkCheck className="size-5" aria-hidden />
        {compact ? "Saved" : "Saved · View my trips"}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className={`${base} disabled:opacity-70 ${
        compact ? "bg-surface px-4 text-navy ring-1 ring-line hover:bg-navy-soft" : "w-full bg-brand-gradient text-white shadow-float"
      }`}
    >
      {saving ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Bookmark className="size-5" aria-hidden />}
      {saving ? "Saving…" : compact ? "Save" : "Save trip"}
    </button>
  );
}
