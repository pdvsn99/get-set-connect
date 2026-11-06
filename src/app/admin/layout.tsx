import Link from "next/link";
import { ClipboardList, Inbox, LogOut, Store } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { LogoMark } from "@/components/brand";
import { requireAdmin } from "@/lib/auth/session";
import { readDb } from "@/lib/db/store";
import { brand } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Operations", template: `%s · Operations · ${brand.name}` } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const db = await readDb();
  const now = Date.now();
  const myOverdue = db.tasks.filter((t) => t.audience === "internal" && t.status === "open" && t.dueDate && new Date(t.dueDate).getTime() < now).length;
  const fresh = db.projects.filter((p) => p.status === "submitted").length;
  const nav = [
    { href: "/admin", label: "Requests", icon: Inbox, badge: fresh },
    { href: "/admin/tasks", label: "Tasks & reminders", icon: ClipboardList, badge: myOverdue, alert: true },
    { href: "/admin/suppliers", label: "Suppliers", icon: Store },
  ];
  return (
    <div className="min-h-dvh bg-navy-50 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="on-dark bg-navy-900 text-white lg:sticky lg:top-0 lg:h-dvh">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:flex-col lg:items-stretch lg:px-5 lg:py-6">
          <Link href="/admin" className="flex items-center gap-2.5 rounded-lg">
            <LogoMark className="h-8 w-8" />
            <span className="leading-tight">
              <span className="block text-sm font-extrabold">{brand.name}</span>
              <span className="block text-xs text-white/60">Operations</span>
            </span>
          </Link>
          <form action={signOut} className="lg:hidden">
            <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10" aria-label="Sign out"><LogOut className="h-4 w-4" aria-hidden="true" /></button>
          </form>
        </div>
        <nav aria-label="Operations" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white">
              <n.icon className="h-4 w-4" aria-hidden="true" /> {n.label}
              {!!n.badge && <span className={`ml-auto rounded-full px-1.5 text-xs font-bold ${n.alert ? "bg-coral-500 text-white" : "bg-lime-400 text-navy-900"}`}>{n.badge}</span>}
            </Link>
          ))}
        </nav>
        <div className="hidden px-5 lg:absolute lg:bottom-6 lg:block">
          <p className="text-sm font-bold">{user.name}</p>
          <p className="text-xs text-white/60">{user.email}</p>
          <form action={signOut} className="mt-3">
            <button className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20"><LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out</button>
          </form>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 sm:px-8 lg:py-8">{children}</main>
    </div>
  );
}
