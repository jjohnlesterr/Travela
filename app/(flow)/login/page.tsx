import TopBar from "@/components/TopBar";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Travela" };

/** Only same-site relative paths are allowed as a post-login destination. */
function safeNext(v: string | string[] | undefined) {
  const next = typeof v === "string" ? v : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/profile";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, mode } = await searchParams;
  return (
    <>
      <TopBar title="Account" />
      <LoginForm next={safeNext(next)} initialMode={mode === "signup" ? "signup" : "signin"} />
    </>
  );
}
