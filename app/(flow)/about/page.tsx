import TopBar from "@/components/TopBar";

export const metadata = { title: "About · Travela" };

export default function AboutPage() {
  return (
    <>
      <TopBar title="About Travela" />
      <article className="px-5 pt-2 text-[15px] leading-relaxed text-navy/90">
        <h2 className="font-display text-2xl font-black text-navy">Travel smarter. Explore responsibly.</h2>
        <p className="mt-3">
          Travela helps you understand the <strong>estimated tourism pressure</strong> of a destination and suggests
          calmer places with a similar experience, so you can plan trips that are kinder to local communities and
          nature.
        </p>
        <h3 className="mt-6 font-display text-lg font-extrabold text-navy">What the score means</h3>
        <p className="mt-2">
          The score (0–100) is an estimate built from tourism activity signals: the concentration of hotels,
          attractions and eateries near the center (40%), review activity on Google Maps (30%), travel season (20%)
          and environmental sensitivity (10%). It is <strong>not</strong> a live count of tourists. Popular places aren&apos;t &ldquo;bad&rdquo;; the score simply helps you choose when and
          where to go.
        </p>
        <ul className="mt-3 flex flex-col gap-1.5">
          <li><strong className="text-pressure-low-ink">0–39 Low</strong> · lighter visitor pressure</li>
          <li><strong className="text-pressure-mod-ink">40–69 Moderate</strong> · steady visitor activity</li>
          <li><strong className="text-pressure-high-ink">70–100 High</strong> · heavy visitor activity</li>
        </ul>
        <h3 className="mt-6 font-display text-lg font-extrabold text-navy">Photo credits</h3>
        <p className="mt-2 text-ink-muted">
          Destination photos come from Wikimedia Commons under Creative Commons licenses. Full attribution is listed in{" "}
          <a
            href="/images/destinations/CREDITS.md"
            className="font-semibold text-ocean underline underline-offset-2"
          >
            CREDITS.md
          </a>
          .
        </p>
      </article>
    </>
  );
}
