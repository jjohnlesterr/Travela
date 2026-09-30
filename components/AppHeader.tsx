import Image from "next/image";
import Link from "next/link";

type Props = {
  /** Page title; omit to show the Travela logo instead. */
  title?: string;
  subtitle?: string;
};

/** Minimal page header: logo (Home) or title. Profile lives in the bottom nav. */
export default function AppHeader({ title, subtitle }: Props) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-3">
      {title ? (
        <div className="min-w-0">
          <h1 className="font-display text-[28px] leading-tight font-black text-navy">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
        </div>
      ) : (
        <Link href="/" aria-label="Travela home" className="-ml-1 flex h-11 items-center">
          <Image
            src="/images/travela-logo.png"
            alt="Travela"
            width={1780}
            height={492}
            preload
            sizes="120px"
            className="h-8 w-auto"
          />
        </Link>
      )}
    </header>
  );
}
