"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authField, authPrimary, friendlyAuthError } from "@/components/AuthCard";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD = 6;

export default function SignupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function signUp(form: FormData) {
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    setNotice(null);
    if (password.length < MIN_PASSWORD) return setError(`Please use a password with at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError("Passwords don't match.");

    setPending(true);
    setError(null);
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });
    if (error) {
      setPending(false);
      setError(friendlyAuthError(error.message));
      return;
    }
    if (!data.session) {
      // Only if email confirmation gets switched on in Supabase.
      setPending(false);
      setNotice("Check your inbox to confirm your email, then sign in.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    // onSubmit (not `action`) so React doesn't clear the fields after a validation error.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void signUp(new FormData(e.currentTarget));
      }}
      className="mt-5 flex flex-col gap-3"
    >
      <label className="sr-only" htmlFor="signup-name">
        Full name
      </label>
      <input id="signup-name" name="name" autoComplete="name" required maxLength={60} placeholder="Full name" className={authField} />

      <label className="sr-only" htmlFor="signup-email">
        Email
      </label>
      <input id="signup-email" name="email" type="email" autoComplete="email" required placeholder="Email" className={authField} />

      <label className="sr-only" htmlFor="signup-password">
        Password
      </label>
      <input
        id="signup-password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD}
        placeholder={`Password (at least ${MIN_PASSWORD} characters)`}
        className={authField}
      />

      <label className="sr-only" htmlFor="signup-confirm">
        Confirm password
      </label>
      <input
        id="signup-confirm"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        placeholder="Confirm password"
        className={authField}
      />

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

      <button type="submit" disabled={pending} className={`mt-1 ${authPrimary}`}>
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        Create account
      </button>

      <p className="text-center text-[15px] text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-ocean">
          Sign in
        </Link>
      </p>
    </form>
  );
}
