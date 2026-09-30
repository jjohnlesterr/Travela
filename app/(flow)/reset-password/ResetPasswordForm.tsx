"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(form: FormData) {
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password: String(form.get("password") ?? "") });
    setPending(false);
    if (error) {
      setError(/password/i.test(error.message) ? "Please use a password with at least 6 characters." : "Couldn't update your password. Please try again.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form action={submit} className="flex flex-col gap-3 rounded-3xl bg-surface p-5 shadow-card">
      <label className="text-sm font-semibold text-navy" htmlFor="new-password">
        Choose a new password
      </label>
      <input
        id="new-password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={6}
        placeholder="At least 6 characters"
        className="h-13 w-full rounded-2xl bg-sand px-4 text-base text-navy ring-1 ring-line outline-none placeholder:text-ink-muted/70 focus:bg-surface focus:ring-2 focus:ring-ocean"
      />
      {error && (
        <p role="alert" className="rounded-2xl bg-pressure-high-soft px-4 py-2.5 text-[14px] text-pressure-high-ink">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-gradient font-semibold text-white shadow-float disabled:opacity-70"
      >
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        Save password
      </button>
    </form>
  );
}
