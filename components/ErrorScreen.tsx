"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

/** Friendly fallback for route error boundaries. Never shows raw error details. */
export default function ErrorScreen({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-navy-soft text-navy">
        <CloudOff className="size-8" aria-hidden />
      </span>
      <h1 className="mt-5 font-display text-2xl font-black text-navy">Something went off-route</h1>
      <p className="mt-2 max-w-[30ch] text-[15px] text-ink-muted">
        We couldn&apos;t load this screen. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 flex h-12 items-center gap-2 rounded-2xl bg-navy px-6 font-semibold text-white"
      >
        <RefreshCw className="size-4" aria-hidden />
        Try again
      </button>
      <Link href="/" className="mt-1 flex h-11 items-center text-sm font-semibold text-ocean">
        Back to Home
      </Link>
    </div>
  );
}
