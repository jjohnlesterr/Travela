import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "Offline · Travela" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <Image src="/icons/icon-192.png" alt="" width={88} height={88} className="rounded-full mix-blend-multiply" />
      <h1 className="mt-5 font-display text-2xl font-black text-navy">You&apos;re offline</h1>
      <p className="mt-2 max-w-[30ch] text-[15px] text-ink-muted">
        Travela needs a connection to load destinations. Check your signal and try again.
      </p>
      <Link href="/" className="mt-6 flex h-12 items-center rounded-2xl bg-navy px-6 font-semibold text-white">
        Try again
      </Link>
    </main>
  );
}
