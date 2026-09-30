import TopBar from "@/components/TopBar";

/** Shown while the analysis resolves. Cached destinations are near-instant; a brand-new place can take up to a minute. */
export default function Loading() {
  return (
    <div aria-busy="true">
      <div className="relative h-[276px] animate-pulse rounded-b-[36px] bg-navy-soft motion-reduce:animate-none">
        <TopBar overlay />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <div className="h-9 w-2/3 rounded-xl bg-navy/10" />
          <div className="mt-3 h-4 w-1/2 rounded-lg bg-navy/10" />
        </div>
      </div>

      <section className="mt-5 px-4">
        <div className="rounded-3xl bg-surface p-5 shadow-card">
          <div className="h-5 w-3/5 rounded-lg bg-navy-soft" />
          <div className="mx-auto mt-6 h-28 w-56 animate-pulse rounded-t-full bg-navy-soft motion-reduce:animate-none" />
          <p className="mt-5 text-center text-[14px] font-semibold text-navy" role="status">
            Reading tourism activity signals…
          </p>
          <p className="mt-1 text-center text-[13px] text-ink-muted">
            New destinations can take up to a minute the first time.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 animate-pulse rounded-lg bg-navy-soft motion-reduce:animate-none" style={{ width: `${88 - i * 14}%` }} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
