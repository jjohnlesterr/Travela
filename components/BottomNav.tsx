"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Compass, House, Route, UserRound, type LucideIcon } from "lucide-react";

type Tab = { href: string; label: string; icon: LucideIcon };

const LEFT: Tab[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Compass },
];
const RIGHT: Tab[] = [
  { href: "/trips", label: "Trips", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavItem({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5"
    >
      <span
        className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-300 ${
          active ? "bg-leaf-soft text-leaf-deep" : "text-ink-muted"
        }`}
      >
        <Icon className="size-[21px]" strokeWidth={active ? 2.4 : 2} aria-hidden />
      </span>
      <span className={`text-[11px] leading-tight ${active ? "font-bold text-navy" : "font-medium text-ink-muted"}`}>
        {tab.label}
      </span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const planActive = pathname.startsWith("/plan");

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
    >
      <div className="pointer-events-auto flex h-[68px] items-center rounded-[26px] border border-white/70 bg-white/85 px-1.5 shadow-float backdrop-blur-xl">
        {LEFT.map((t) => (
          <NavItem key={t.href} tab={t} active={isActive(pathname, t.href)} />
        ))}

        <Link
          href="/plan"
          aria-current={planActive ? "page" : undefined}
          className="flex flex-1 flex-col items-center justify-end gap-0.5 self-stretch pb-3"
        >
          <span
            className={`-mt-7 flex size-[60px] items-center justify-center rounded-full bg-brand-gradient text-white ring-4 ring-white shadow-[0_10px_24px_-8px_rgb(22_104_184/0.65)] transition-transform active:scale-95 ${
              planActive ? "scale-105" : ""
            }`}
          >
            <Route className="size-7" strokeWidth={2.2} aria-hidden />
          </span>
          <span className={`text-[11px] leading-tight ${planActive ? "font-bold text-navy" : "font-semibold text-navy/80"}`}>
            Plan
          </span>
        </Link>

        {RIGHT.map((t) => (
          <NavItem key={t.href} tab={t} active={isActive(pathname, t.href)} />
        ))}
      </div>
    </nav>
  );
}
