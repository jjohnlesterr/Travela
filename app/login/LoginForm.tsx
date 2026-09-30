"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authField, authPrimary, friendlyAuthError } from "@/components/AuthCard";
import { createClient } from "@/lib/supabase/client";

/** Sign in only. Account creation lives on /signup. */
export default function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState<"signin" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(linkError ? "That link has expired. Please try again." : null);
  const [notice, setNotice] = useState<string | null>(null);

  async function signIn(form: FormData) {
    setPending("signin");
    setError(null);
    setNotice(null);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    if (error) {
      setPending(null);
      setError(friendlyAuthError(error.message));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function forgotPassword() {
    const email = String(new FormData(formRef.current ?? undefined).get("email") ?? "").trim();
    if (!email) {
      setNotice(null);
      setError("Enter your email above, then tap “Forgot password?”.");
      return;
    }
    setPending("reset");
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
    setPending(null);
    if (error) setError(friendlyAuthError(error.message));
    else setNotice("If that email has an account, a reset link is on its way.");
  }

  return (
    // onSubmit (not `action`) so React doesn't clear the fields after a failed attempt.
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        void signIn(new FormData(e.currentTarget));
      }}
      className="mt-5 flex flex-col gap-3"
    >
      <label className="sr-only" htmlFor="login-email">
        Email
      </label>
      <input id="login-email" name="email" type="email" autoComplete="email" required placeholder="Email" className={authField} />

      <label className="sr-only" htmlFor="login-password">
        Password
      </label>
      <input
        id="login-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        placeholder="Password"
        className={authField}
      />

      <button
        type="button"
        onClick={() => void forgotPassword()}
        disabled={pending !== null}
        className="-mt-1 min-h-10 self-end text-sm font-semibold text-ocean"
      >
        {pending === "reset" ? "Sending…" : "Forgot password?"}
      </button>

      {error && (
        <p role="alert" className="rounded-2xl bg-pressure-high-soft px-4 py-2.5 text-[14px] text-pressure-high-ink">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-2xl bg-leaf-soft px-4 py-2.5 text-[14px] text-leaf-deep">
          {notice}
        </p>
      )}

      <button type="submit" disabled={pending !== null} className={authPrimary}>
        {pending === "signin" && <Loader2 className="size-5 animate-spin" aria-hidden />}
        Sign in
      </button>
      <Link
        href="/signup"
        className="flex h-14 items-center justify-center rounded-2xl bg-surface font-semibold text-navy ring-1 ring-line transition-colors hover:bg-navy-soft active:scale-[0.98]"
      >
        Create account
      </Link>
    </form>
  );
}
