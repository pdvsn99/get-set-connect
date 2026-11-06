import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { loadDraft } from "@/app/actions/application";
import { Logo } from "@/components/brand";
import type { ApplicationData } from "@/lib/application";
import { Wizard } from "./wizard";

export const metadata = { title: "Get connected" };
export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const user = await getCurrentUser();
  if (user?.role === "admin") redirect("/admin");
  const draft = (await loadDraft()) as { data: ApplicationData; step: number } | null;
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <span className="text-sm font-semibold text-navy-900/60">Free · about 5 minutes</span>
      </header>
      <main id="main" className="px-4 pb-20 sm:px-6">
        <Wizard user={user ? { name: user.name, email: user.email, phone: user.phone } : null} serverDraft={draft?.data ? draft : null} />
      </main>
    </div>
  );
}
