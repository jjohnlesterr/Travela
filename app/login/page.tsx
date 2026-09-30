import AuthCard from "@/components/AuthCard";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Travela" };

/** Same-site relative paths only; everything else lands on Home. */
function safeNext(v: string | string[] | undefined) {
  const next = typeof v === "string" ? v : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

/** First screen for signed-out users (proxy.ts sends every protected page here). */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <AuthCard banner>
      <LoginForm next={safeNext(next)} linkError={error === "link"} />
    </AuthCard>
  );
}
