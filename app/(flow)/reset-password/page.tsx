import TopBar from "@/components/TopBar";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = { title: "New password · Travela" };

/** Reached from the password-reset email (via /auth/callback, which signs the user in). */
export default function ResetPasswordPage() {
  return (
    <>
      <TopBar title="New password" />
      <section className="px-4 pt-2">
        <ResetPasswordForm />
      </section>
    </>
  );
}
