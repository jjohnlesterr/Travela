"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

const input =
  "h-13 w-full rounded-2xl bg-surface px-4 text-base text-navy ring-1 ring-line outline-none placeholder:text-ink-muted/70 focus:ring-2 focus:ring-ocean";

export default function LoginForm({ next, initialMode }: { next: string; initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(form: FormData) {
    setPending(true);
    setError(null);
    setNotice(null);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const supabase = createClient();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        if (error) throw error;
        if (!data.session) {
          // Email confirmation is enabled on the Supabase project.
          setNotice("Check your inbox to confirm your email, then sign in here.");
          setMode("signin");
          return;
        }
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      const msg = (err as Error).message ?? "";
      setError(
        /invalid login/i.test(msg)
          ? "That email and password don't match. Try again or create an account."
          : /already registered/i.test(msg)
            ? "An account with this email already exists. Sign in instead."
            : /password/i.test(msg)
              ? "Please use a password with at least 6 characters."
              : "Something went wrong. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  const signup = mode === "signup";

  return (
    <section className="px-4 pt-2">
      <h1 className="font-display text-[28px] leading-tight font-black text-navy">
        {signup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-[15px] text-ink-muted">
        {signup ? "Save trips and find them on any device." : "Sign in to save and view your trips."}
      </p>

      <form action={submit} className="mt-6 flex flex-col gap-3">
        {signup && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-navy">Name</span>
            <input name="name" autoComplete="name" required maxLength={60} className={input} placeholder="Your name" />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-navy">Email</span>
          <input name="email" type="email" autoComplete="email" required className={input} placeholder="you@example.com" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-navy">Password</span>
          <input
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={6}
            className={input}
            placeholder={signup ? "At least 6 characters" : "Your password"}
          />
        </label>

        {error && (
          <p role="alert" className="rounded-2xl bg-pressure-high-soft px-4 py-3 text-[14px] text-pressure-high-ink">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-2xl bg-leaf-soft px-4 py-3 text-[14px] text-leaf-deep">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-gradient font-semibold text-white shadow-float transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {pending ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : signup ? (
            <UserPlus className="size-5" aria-hidden />
          ) : (
            <LogIn className="size-5" aria-hidden />
          )}
          {signup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-center text-[15px] text-ink-muted">
        {signup ? "Already have an account?" : "New to Travela?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(signup ? "signin" : "signup");
            setError(null);
          }}
          className="min-h-11 font-semibold text-ocean"
        >
          {signup ? "Sign in" : "Create an account"}
        </button>
      </p>
    </section>
  );
}
