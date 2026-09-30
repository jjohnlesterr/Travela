import Image from "next/image";

/** Shared shell for /login and /signup: one centred card with the Travela logo (and optional banner). */
export default function AuthCard({ banner = false, children }: { banner?: boolean; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+20px)]">
      <div className="w-full rounded-[32px] bg-surface p-5 shadow-float min-[400px]:p-6">
        <Image
          src="/images/travela-logo.png"
          alt="Travela"
          width={1780}
          height={492}
          preload
          sizes="140px"
          className="mx-auto h-9 w-auto"
        />
        {banner && (
          <div className="relative mt-5 h-[168px] overflow-hidden rounded-3xl bg-navy min-[400px]:h-[184px]">
            <Image
              src="/images/destinations/hero.webp"
              alt="Limestone islands in Bacuit Bay, El Nido"
              fill
              preload
              sizes="(max-width: 480px) 100vw, 440px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/35 to-transparent" aria-hidden />
          </div>
        )}
        {children}
      </div>
    </main>
  );
}

export const authField =
  "h-13 w-full rounded-2xl bg-sand px-4 text-base text-navy ring-1 ring-line outline-none placeholder:text-ink-muted/70 focus:bg-surface focus:ring-2 focus:ring-ocean";

export const authPrimary =
  "flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient font-semibold text-white shadow-float transition-transform active:scale-[0.98] disabled:opacity-70";

/** Maps Supabase auth errors to short, friendly copy. */
export function friendlyAuthError(message: string) {
  if (/invalid login/i.test(message)) return "That email and password don't match.";
  if (/already registered|already exists/i.test(message)) return "An account with this email already exists. Sign in instead.";
  if (/password/i.test(message)) return "Please use a password with at least 6 characters.";
  if (/rate limit|too many/i.test(message)) return "Too many attempts. Please wait a minute and try again.";
  if (/email/i.test(message)) return "Please check the email address.";
  return "Something went wrong. Please try again.";
}
