import AuthCard from "@/components/AuthCard";
import SignupForm from "./SignupForm";

export const metadata = { title: "Create account · Travela" };

export default function SignupPage() {
  return (
    <AuthCard>
      <h1 className="mt-5 text-center font-display text-2xl font-black text-navy">Create account</h1>
      <SignupForm />
    </AuthCard>
  );
}
