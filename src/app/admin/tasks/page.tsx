import Link from "next/link";
import { AlertTriangle, Check } from "lucide-react";
import { toggleTask } from "@/app/actions/admin";
import { Pill } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { readDb } from "@/lib/db/store";
import { ageInDays, formatDate, timeAgo } from "@/lib/domain";

export const metadata = { title: "Tasks & reminders" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ who?: string; due?: string; show?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const db = await readDb();
  const now = Date.now();
  const startOfTomorrow = new Date(); startOfTomorrow.setHours(24, 0, 0, 0);
  const who = sp.who ?? "all";
  const project = (id: string) => db.projects.find((p) => p.id === id);
  const user = (id?: string) => db.users.find((u) => u.id === id)?.name;

  const internal = db.tasks
    .filter((t) => t.audience === "internal" && (sp.show === "done" ? t.status === "done" : t.status === "open"))
    .filter((t) => (who === "me" ? t.assigneeId === admin.id : who === "none" ? !t.assigneeId : true))
    .filter((t) => {
      if (sp.due === "overdue") return t.dueDate && new Date(t.dueDate).getTime() < now;
      if (sp.due === "today") return t.dueDate && new Date(t.dueDate).getTime() < startOfTomorrow.getTime();
      return true;
    })
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

  // Reminders: customer actions waiting more than 3 days, and quiet cases.
  const staleCustomer = db.tasks.filter((t) => t.audience === "customer" && t.status === "open" && ageInDays(t.createdAt, now) >= 3);
  const quiet = db.projects.filter((p) => !["completed", "withdrawn"].includes(p.status) && ageInDays(p.updatedAt, now) >= 7);
  const unassigned = db.projects.filter((p) => !p.caseOwnerId && p.status !== "withdrawn");

  const chip = (key: string, value: string, label: string) => {
    const params = new URLSearchParams(Object.entries({ ...sp, [key]: value }).filter(([, v]) => v) as [string, string][]);
    const active = (sp[key as keyof typeof sp] ?? "") === value;
    return <Link href={`?${params}`} className={`rounded-full px-3 py-1.5 text-sm font-bold ${active ? "bg-navy-900 text-white" : "bg-white ring-1 ring-navy-900/10"}`}>{label}</Link>;
  };

  return (
    <>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Tasks & reminders</h1>
      <p className="text-navy-900/65">Internal work across every case. Customer actions are listed under reminders.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {chip("who", "", "Everyone")}{chip("who", "me", "Mine")}{chip("who", "none", "Unassigned")}
        <span className="mx-1 w-px bg-navy-900/10" />
        {chip("due", "", "Any due date")}{chip("due", "today", "Due today")}{chip("due", "overdue", "Overdue")}
        <span className="mx-1 w-px bg-navy-900/10" />
        {chip("show", "", "Open")}{chip("show", "done", "Done")}
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_22rem]">
        <ul className="divide-y divide-navy-900/5 rounded-2xl bg-white shadow-card">
          {internal.map((t) => {
            const p = project(t.projectId);
            const overdue = t.status === "open" && t.dueDate && new Date(t.dueDate).getTime() < now;
            return (
              <li key={t.id} className="flex items-start gap-3 p-4">
                <form action={toggleTask}>
                  <input type="hidden" name="taskId" value={t.id} />
                  <button className={`mt-0.5 grid h-6 w-6 place-items-center rounded-lg border-2 ${t.status === "done" ? "border-lime-500 bg-lime-400" : "border-navy-900/30 hover:border-navy-900"}`} aria-label={`${t.status === "done" ? "Reopen" : "Complete"}: ${t.title}`}>
                    {t.status === "done" && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                </form>
                <div className="min-w-0 flex-1">
                  <p className={`font-bold ${t.status === "done" ? "line-through text-navy-900/45" : ""}`}>{t.title}</p>
                  {t.detail && <p className="text-sm text-navy-900/60">{t.detail}</p>}
                  <p className="mt-0.5 text-xs text-navy-900/55">
                    {p && <Link href={`/admin/cases/${p.id}`} className="font-bold underline">{p.reference} · {p.name}</Link>} · {user(t.assigneeId) ?? "Unassigned"} · created {timeAgo(t.createdAt)}
                  </p>
                </div>
                {t.dueDate && (
                  <span className={`shrink-0 text-sm font-bold ${overdue ? "text-coral-700" : "text-navy-900/60"}`}>
                    {overdue && <AlertTriangle className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />}
                    {formatDate(t.dueDate)}
                  </span>
                )}
              </li>
            );
          })}
          {internal.length === 0 && <li className="p-10 text-center text-navy-900/60">Nothing here. Nice work!</li>}
        </ul>

        <div className="space-y-4">
          <section className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="font-extrabold">Waiting on customers (3+ days)</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {staleCustomer.map((t) => { const p = project(t.projectId); return (
                <li key={t.id}><Link href={`/admin/cases/${t.projectId}`} className="font-bold underline">{p?.reference}</Link> {t.title} <Pill tone="coral" className="ml-1">{ageInDays(t.createdAt, now)}d</Pill></li>
              ); })}
              {staleCustomer.length === 0 && <li className="text-navy-900/60">None — consider a friendly nudge when there are.</li>}
            </ul>
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="font-extrabold">No update for 7+ days</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {quiet.map((p) => <li key={p.id}><Link href={`/admin/cases/${p.id}`} className="font-bold underline">{p.reference}</Link> {p.name} · {timeAgo(p.updatedAt)}</li>)}
              {quiet.length === 0 && <li className="text-navy-900/60">Every active case has had a recent update.</li>}
            </ul>
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="font-extrabold">Unassigned cases</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {unassigned.map((p) => <li key={p.id}><Link href={`/admin/cases/${p.id}`} className="font-bold underline">{p.reference}</Link> {p.name}</li>)}
              {unassigned.length === 0 && <li className="text-navy-900/60">All cases have an owner.</li>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
