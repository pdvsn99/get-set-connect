import Link from "next/link";
import { AlertTriangle, Filter, Plug, RotateCcw } from "lucide-react";
import { resetDemo } from "@/app/actions/admin";
import { SubmitButton } from "@/components/forms";
import { Pill, UtilityChip } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { readDb, storageMode } from "@/lib/db/store";
import type { ProjectStatus } from "@/lib/db/types";
import { ageInDays, PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL } from "@/lib/domain";
import { listIntegrations } from "@/lib/integrations/adapters";
import { summarise } from "@/lib/repo/views";

export const metadata = { title: "Requests" };

const STATUS_TONE: Record<ProjectStatus, "lime" | "coral" | "sky" | "green" | "neutral"> = {
  submitted: "lime",
  in_progress: "sky",
  awaiting_customer: "coral",
  completed: "green",
  withdrawn: "neutral",
};

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await readDb();
  const now = Date.now();
  const opName = (id?: string) => db.networkOperators.find((o) => o.id === id)?.name;

  const all = db.projects.map((p) => {
    const s = summarise(db, p);
    const internalOpen = db.tasks.filter((t) => t.projectId === p.id && t.audience === "internal" && t.status === "open");
    const overdue = internalOpen.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now).length;
    return { p, s, internalOpen: internalOpen.length, overdue, age: ageInDays(p.createdAt, now), owner: db.users.find((u) => u.id === p.caseOwnerId)?.name, customer: db.users.find((u) => u.id === p.createdById), org: db.organisations.find((o) => o.id === p.organisationId) };
  });

  const q = (sp.q ?? "").toLowerCase();
  const rows = all
    .filter(({ p, customer, org }) => {
      if (sp.status && sp.status !== "open" && p.status !== sp.status) return false;
      if (sp.status === "open" && (p.status === "completed" || p.status === "withdrawn")) return false;
      if (!sp.status && p.status === "withdrawn") return false;
      if (sp.utility && !p.utilities.includes(sp.utility as "electricity" | "gas")) return false;
      if (sp.network && !Object.values(p.networkOperatorIds).includes(sp.network)) return false;
      if (sp.owner === "none" && p.caseOwnerId) return false;
      if (sp.owner && sp.owner !== "none" && p.caseOwnerId !== sp.owner) return false;
      if (sp.age === "7" && ageInDays(p.createdAt, now) > 7) return false;
      if (sp.age === "30" && ageInDays(p.createdAt, now) > 30) return false;
      if (sp.age === "old" && ageInDays(p.createdAt, now) <= 30) return false;
      if (q && !`${p.reference} ${p.name} ${p.postcode} ${customer?.name} ${customer?.email} ${org?.name}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => Number(b.p.status === "submitted") - Number(a.p.status === "submitted") || b.overdue - a.overdue || b.p.updatedAt.localeCompare(a.p.updatedAt));

  const stat = (label: string, value: number, href: string, tone = "") => (
    <Link href={href} className="rounded-2xl bg-white p-4 shadow-card transition hover:-translate-y-0.5">
      <p className="text-xs font-bold uppercase tracking-wide text-navy-900/55">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${tone}`}>{value}</p>
    </Link>
  );
  const staff = db.users.filter((u) => u.role === "admin");
  const select = "field-input py-2 text-sm";

  return (
    <>
      {sp.reset && <p role="status" className="mb-4 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900">Demo data has been reset.</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Requests</h1>
          <p className="text-navy-900/65">All incoming and active connection requests.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat("New requests", all.filter((r) => r.p.status === "submitted").length, "/admin?status=submitted", "text-lime-700")}
        {stat("Waiting on customer", all.filter((r) => r.p.status === "awaiting_customer").length, "/admin?status=awaiting_customer", "text-coral-600")}
        {stat("Overdue tasks", all.reduce((n, r) => n + r.overdue, 0), "/admin/tasks?due=overdue", "text-coral-600")}
        {stat("Unassigned", all.filter((r) => !r.p.caseOwnerId && r.p.status !== "withdrawn").length, "/admin?owner=none")}
      </div>

      <form className="mt-6 grid gap-2 rounded-2xl bg-white p-4 shadow-card sm:grid-cols-3 lg:grid-cols-7" role="search" aria-label="Filter requests">
        <div className="sm:col-span-3 lg:col-span-2">
          <label htmlFor="q" className="sr-only">Search</label>
          <input id="q" name="q" defaultValue={sp.q} placeholder="Search ref, name, postcode, customer…" className={select} />
        </div>
        <div>
          <label htmlFor="status" className="sr-only">Status</label>
          <select id="status" name="status" defaultValue={sp.status ?? ""} className={select}>
            <option value="">All (excl. withdrawn)</option>
            <option value="open">All open</option>
            {Object.entries(PROJECT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="utility" className="sr-only">Utility</label>
          <select id="utility" name="utility" defaultValue={sp.utility ?? ""} className={select}>
            <option value="">Any utility</option>
            <option value="electricity">Electricity</option>
            <option value="gas">Gas</option>
          </select>
        </div>
        <div>
          <label htmlFor="network" className="sr-only">Network area</label>
          <select id="network" name="network" defaultValue={sp.network ?? ""} className={select}>
            <option value="">Any network</option>
            {db.networkOperators.map((o) => <option key={o.id} value={o.id}>{o.kind} · {o.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="age" className="sr-only">Age</label>
          <select id="age" name="age" defaultValue={sp.age ?? ""} className={select}>
            <option value="">Any age</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="old">Older than 30 days</option>
          </select>
        </div>
        <div className="flex gap-2">
          <label htmlFor="owner" className="sr-only">Owner</label>
          <select id="owner" name="owner" defaultValue={sp.owner ?? ""} className={select}>
            <option value="">Any owner</option>
            <option value="none">Unassigned</option>
            {staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button className="grid shrink-0 place-items-center rounded-xl bg-navy-900 px-3 text-white" aria-label="Apply filters"><Filter className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </form>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-card">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <caption className="sr-only">Connection requests</caption>
          <thead className="bg-navy-50 text-xs font-bold uppercase tracking-wide text-navy-900/60">
            <tr>
              {["Ref", "Project", "Customer", "Utilities", "Network", "Progress", "Status", "Owner", "Age", "Tasks"].map((h) => <th key={h} scope="col" className="px-3 py-2.5">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-900/5">
            {rows.map(({ p, s, internalOpen, overdue, age, owner, customer, org }) => (
              <tr key={p.id} className="hover:bg-lime-100/40">
                <td className="px-3 py-2.5 font-mono text-xs font-bold"><Link href={`/admin/cases/${p.id}`} className="underline decoration-lime-500 decoration-2 underline-offset-2">{p.reference}</Link></td>
                <td className="px-3 py-2.5">
                  <Link href={`/admin/cases/${p.id}`} className="font-bold hover:underline">{p.name}</Link>
                  <span className="block text-xs text-navy-900/55">{PROJECT_TYPE_LABEL[p.projectType]}{s.plotCount > 1 ? ` · ${s.plotCount} plots` : ""} · {p.postcode}</span>
                </td>
                <td className="px-3 py-2.5">{customer?.name}<span className="block text-xs text-navy-900/55">{org && org.name !== customer?.name ? org.name : customer?.email}</span></td>
                <td className="px-3 py-2.5"><div className="flex flex-wrap gap-1">{p.utilities.map((u) => <UtilityChip key={u} utility={u} />)}</div></td>
                <td className="px-3 py-2.5 text-xs">{p.utilities.map((u) => <span key={u} className="block">{opName(p.networkOperatorIds[u]) ?? <em className="text-coral-700">Not set</em>}</span>)}</td>
                <td className="px-3 py-2.5"><span className="font-bold">{s.progress}%</span> <span className="text-xs text-navy-900/55">stage {s.stage}</span></td>
                <td className="px-3 py-2.5"><Pill tone={STATUS_TONE[p.status]}>{PROJECT_STATUS_LABEL[p.status]}</Pill></td>
                <td className="px-3 py-2.5">{owner ?? <em className="text-navy-900/50">Unassigned</em>}</td>
                <td className="px-3 py-2.5">{age}d</td>
                <td className="px-3 py-2.5">
                  {internalOpen}
                  {overdue > 0 && <span className="ml-1 inline-flex items-center gap-0.5 font-bold text-coral-700"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />{overdue}</span>}
                  {s.openCustomerTasks.length > 0 && <span className="block text-xs text-coral-700">{s.openCustomerTasks.length} with customer</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={10} className="px-3 py-10 text-center text-navy-900/60">No requests match these filters. <Link href="/admin" className="font-bold underline">Clear filters</Link></td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl bg-white p-5 shadow-card" aria-labelledby="int-title">
          <h2 id="int-title" className="flex items-center gap-2 font-extrabold"><Plug className="h-4 w-4" aria-hidden="true" /> Integrations</h2>
          <p className="text-sm text-navy-900/60">Every integration is manual or mock in this proof of concept. Nothing is sent to network operators or suppliers.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {listIntegrations().map((i) => (
              <li key={i.name} className="rounded-xl bg-navy-50 p-3 text-sm">
                <p className="font-bold">{i.name} <Pill tone={i.mode === "live" ? "green" : "neutral"} className="ml-1 uppercase">{i.mode}</Pill></p>
                <p className="mt-1 text-navy-900/65">{i.description}</p>
              </li>
            ))}
            <li className="rounded-xl bg-navy-50 p-3 text-sm">
              <p className="font-bold">Database <Pill className="ml-1 uppercase">{storageMode()}</Pill></p>
              <p className="mt-1 text-navy-900/65">Demo store. Swap for Supabase using the schema in <code>supabase/migrations</code>.</p>
            </li>
          </ul>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-card" aria-labelledby="demo-title">
          <h2 id="demo-title" className="flex items-center gap-2 font-extrabold"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Demo data</h2>
          <p className="mt-1 text-sm text-navy-900/60">Put everything back to the original sample data. This removes any requests and uploads made during testing.</p>
          <form action={resetDemo} className="mt-3">
            <SubmitButton variant="danger" size="sm" pendingText="Resetting…">Reset demo data</SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}
