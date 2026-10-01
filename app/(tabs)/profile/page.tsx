import Link from "next/link";
import { Bookmark, ChevronRight, Heart, Info, LogIn, LogOut, UserRound } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import InstallAppItem from "@/components/InstallAppItem";
import { signOut } from "@/lib/actions";
import { INTERESTS } from "@/lib/destinations";
import { countTrips, getSessionUser } from "@/lib/trips";

export const metadata = { title: "Profile · Travela" };

export default async function ProfilePage() {
  const { claims } = await getSessionUser();
  const email = typeof claims?.email === "string" ? claims.email : null;
  const meta = claims?.user_metadata as { name?: string } | undefined;
  const name = meta?.name || email?.split("@")[0] || null;
  const tripCount = email ? await countTrips() : null;

  return (
    <>
      <AppHeader title="Profile" />

      <section className="px-4">
        <div className="rounded-3xl bg-navy p-5 text-white shadow-card">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/15">
              <UserRound className="size-7" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-xl font-extrabold">{name ?? "Guest traveler"}</h2>
              <p className="truncate text-sm text-white/75">{email ?? "Sign in to save trips across devices."}</p>
            </div>
          </div>
          {tripCount !== null && (
            <Link
              href="/trips"
              className="mt-4 flex min-h-12 items-center gap-3 rounded-2xl bg-white/10 px-3.5 text-[14px] font-semibold text-white"
            >
              <Bookmark className="size-4 shrink-0 text-sky" aria-hidden />
              <span className="flex-1">
                {tripCount} saved {tripCount === 1 ? "trip" : "trips"}
              </span>
              <ChevronRight className="size-4 text-white/70" aria-hidden />
            </Link>
          )}
          <div className="mt-4 border-t border-white/15 pt-3">
            {email ? (
              <form action={signOut}>
                <button type="submit" className="flex min-h-11 items-center gap-2 text-[14px] font-semibold text-white/90">
                  <LogOut className="size-4 shrink-0 text-sky" aria-hidden />
                  Sign out
                </button>
              </form>
            ) : (
              <Link href="/login?next=/profile" className="flex min-h-11 items-center gap-2 text-[14px] font-semibold text-white">
                <LogIn className="size-4 shrink-0 text-sky" aria-hidden />
                Sign in or create an account
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mt-7 px-4">
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-extrabold text-navy">
          <Heart className="size-5 text-leaf" aria-hidden />
          Travel interests
        </h2>
        <p className="mb-3 text-sm text-ink-muted">When you plan, we suggest interests that fit each destination — beaches, cafés, hiking and more.</p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <span key={i} className="flex h-9 items-center rounded-full bg-surface px-4 text-sm font-medium text-navy ring-1 ring-line">
              {i}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-7 px-4">
        <h2 className="mb-3 font-display text-lg font-extrabold text-navy">App</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface shadow-card">
          <InstallAppItem />
          <li>
            <Link href="/about" className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-sand">
              <Info className="size-5 shrink-0 text-ocean" aria-hidden />
              <div className="flex-1">
                <p className="font-semibold text-navy">About Travela</p>
                <p className="text-[13px] text-ink-muted">How estimated tourism pressure works · photo credits</p>
              </div>
            </Link>
          </li>
        </ul>
      </section>
    </>
  );
}
