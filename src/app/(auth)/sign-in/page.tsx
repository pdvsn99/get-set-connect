import Link from "next/link";
import { DEMO_ACCOUNTS } from "@/lib/db/seed";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; demo?: string }> }) {
  const { next, demo } = await searchParams;
  const preset = DEMO_ACCOUNTS.find((a) => demo && a.email.startsWith(demo));
  return (
    <>
      <h1 className="text-3xl font-extrabold">Welcome back</h1>
      <p className="mt-2 text-navy-900/70">Sign in to see My Connections.</p>
      <SignInForm next={next} accounts={DEMO_ACCOUNTS} preset={preset?.email} />
      <p className="mt-6 text-center text-sm text-navy-900/70">
        New here?{" "}
        <Link href="/register" className="font-bold text-navy-900 underline decoration-lime-500 decoration-2 underline-offset-4">Create an account</Link>{" "}
        or <Link href="/apply" className="font-bold text-navy-900 underline decoration-lime-500 decoration-2 underline-offset-4">start an application</Link>.
      </p>
    </>
  );
}
