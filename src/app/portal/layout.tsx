import Link from "next/link";
import { Bell, LogOut, Plus } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/brand";
import { LinkButton } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { readDb } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCustomer();
  const db = await readDb();
  const unread = db.notifications.filter((n) => n.userId === user.id && !n.read).length;
  const org = db.organisations.find((o) => o.id === user.organisationId);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-navy-900/5 bg-cream-100/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo href="/portal" />
          <nav aria-label="Portal" className="flex items-center gap-1 sm:gap-2">
            <Link href="/portal" className="hidden rounded-full px-3 py-2 text-sm font-bold hover:bg-navy-900/5 sm:block">My Connections</Link>
            <Link href="/portal/notifications" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-navy-900/5" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral-500 px-1 text-[11px] font-extrabold text-white animate-pop" aria-hidden="true">{unread}</span>
              )}
            </Link>
            <LinkButton href="/apply" size="sm" className="hidden sm:inline-flex"><Plus className="h-4 w-4" aria-hidden="true" /> New request</LinkButton>
            <div className="ml-1 hidden text-right text-xs leading-tight md:block">
              <p className="font-bold">{user.name}</p>
              {org && org.name !== user.name && <p className="text-navy-900/60">{org.name}</p>}
            </div>
            <form action={signOut}>
              <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-navy-900/5" aria-label="Sign out" title="Sign out">
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6">{children}</main>
    </div>
  );
}
