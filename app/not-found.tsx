import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-navy-soft text-navy">
        <Compass className="size-8" aria-hidden />
      </span>
      <h1 className="mt-5 font-display text-2xl font-black text-navy">We couldn&apos;t find that place</h1>
      <p className="mt-2 max-w-[30ch] text-[15px] text-ink-muted">
        It may not be in Travela yet. Browse the destinations we cover instead.
      </p>
      <Link href="/explore" className="mt-6 flex h-12 items-center rounded-2xl bg-navy px-6 font-semibold text-white">
        Explore destinations
      </Link>
    </main>
  );
}
