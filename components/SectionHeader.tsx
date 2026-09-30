import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Props = {
  title: string;
  href?: string;
  linkLabel?: string;
};

export default function SectionHeader({ title, href, linkLabel = "See all" }: Props) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-4">
      <h2 className="font-display text-xl font-extrabold text-navy">{title}</h2>
      {href && (
        <Link
          href={href}
          className="-mr-2 flex min-h-11 shrink-0 items-center gap-0.5 px-2 whitespace-nowrap text-sm font-semibold text-ocean"
        >
          {linkLabel}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
