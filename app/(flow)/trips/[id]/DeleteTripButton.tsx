"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteTrip } from "@/lib/actions";

/** Delete with an inline confirmation step (no browser dialogs). */
export default function DeleteTripButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-pressure-high-ink hover:bg-pressure-high-soft"
      >
        <Trash2 className="size-4" aria-hidden />
        Delete trip
      </button>
    );
  }

  return (
    <div className="rounded-3xl bg-pressure-high-soft p-4" role="group" aria-label="Confirm delete">
      <p className="text-[14px] font-semibold text-pressure-high-ink">Delete this trip? This can&apos;t be undone.</p>
      {error && (
        <p role="alert" className="mt-1 text-[13px] text-pressure-high-ink">
          {error}
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="flex h-11 items-center justify-center rounded-2xl bg-surface text-sm font-semibold text-navy ring-1 ring-line"
        >
          Keep it
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteTrip(id);
              if (res && !res.ok) setError(res.message);
            })
          }
          className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-pressure-high-ink text-sm font-semibold text-white disabled:opacity-70"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
          Delete
        </button>
      </div>
    </div>
  );
}
