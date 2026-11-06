"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CircleAlert, Download, Plus, Search, X } from "lucide-react";
import { addPlots } from "@/app/actions/customer";
import { buttonClass } from "./ui";

export interface PlotRowView {
  id: string;
  name: string;
  address?: string;
  electricity?: { label: string; stage: number; done: boolean; who: string };
  gas?: { label: string; stage: number; done: boolean; who: string };
  mpan?: string;
  mprn?: string;
  supplier?: string;
  appointment?: string;
  actions: string[];
  bucket: "action" | "network" | "meters" | "connected" | "early";
}

const FILTERS = [
  ["all", "All plots"],
  ["action", "Needs action"],
  ["early", "Applications"],
  ["network", "Network works"],
  ["meters", "Meters"],
  ["connected", "Connected"],
] as const;

function StatusCell({ s }: { s?: PlotRowView["electricity"] }) {
  if (!s) return <span className="text-navy-900/40">—</span>;
  return (
    <span className="flex flex-col gap-1">
      <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-bold ${s.done ? "bg-emerald-100 text-emerald-900" : s.who === "customer" ? "bg-coral-100 text-coral-800" : s.who === "network" ? "bg-sky-100 text-sky-900" : s.who === "supplier" ? "bg-violet-100 text-violet-900" : "bg-lime-200"}`}>
        {s.done ? "Connected" : `Stage ${s.stage}/6`}
      </span>
      <span className="text-xs text-navy-900/65">{s.label}</span>
    </span>
  );
}

export function PlotTable({ projectId, rows, utilities, plotWord }: { projectId: string; rows: PlotRowView[]; utilities: ("electricity" | "gas")[]; plotWord: string }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [q, setQ] = useState("");
  const shown = useMemo(
    () =>
      rows.filter(
        (r) =>
          (filter === "all" || r.bucket === filter || (filter === "action" && r.actions.length > 0)) &&
          (!q || `${r.name} ${r.address ?? ""} ${r.mpan ?? ""} ${r.mprn ?? ""}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [rows, filter, q],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    rows.forEach((r) => {
      c[r.bucket] = (c[r.bucket] ?? 0) + 1;
      if (r.actions.length && r.bucket !== "action") c.action = (c.action ?? 0) + 1;
    });
    return c;
  }, [rows]);

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter plots by status">
          {FILTERS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${filter === k ? "bg-navy-900 text-white" : "bg-white ring-1 ring-navy-900/10 hover:ring-navy-900/30"}`}
            >
              {label} <span className={filter === k ? "text-lime-400" : "text-navy-900/50"}>{counts[k] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-navy-900/40" aria-hidden="true" />
            <label htmlFor="plot-search" className="sr-only">Search plots</label>
            <input id="plot-search" className="field-input py-2 pl-9 text-sm" placeholder="Search plot, MPAN…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <a href={`/api/projects/${projectId}/export`} className={buttonClass("secondary", "sm", "shrink-0")}>
            <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
          </a>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-3xl bg-white shadow-card ring-1 ring-navy-900/5">
        <table className="w-full min-w-[900px] text-left text-sm">
          <caption className="sr-only">{plotWord}s and their connection status</caption>
          <thead className="bg-cream-100 text-xs font-bold uppercase tracking-wide text-navy-900/60">
            <tr>
              <th scope="col" className="px-4 py-3">{plotWord}</th>
              {utilities.includes("electricity") && <th scope="col" className="px-4 py-3">Electricity</th>}
              {utilities.includes("gas") && <th scope="col" className="px-4 py-3">Gas</th>}
              {utilities.includes("electricity") && <th scope="col" className="px-4 py-3"><abbr title="Electricity supply number">MPAN</abbr></th>}
              {utilities.includes("gas") && <th scope="col" className="px-4 py-3"><abbr title="Gas supply number">MPRN</abbr></th>}
              <th scope="col" className="px-4 py-3">Supplier</th>
              <th scope="col" className="px-4 py-3">Meter appointment</th>
              <th scope="col" className="px-4 py-3">Outstanding actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-900/5">
            {shown.map((r) => (
              <tr key={r.id} className="align-top transition hover:bg-lime-100/50">
                <th scope="row" className="px-4 py-3">
                  <Link href={`?plot=${r.id}#timeline`} scroll={false} className="font-extrabold whitespace-nowrap underline decoration-lime-500 decoration-2 underline-offset-4 hover:decoration-navy-900" title={r.name}>{r.name.split(" — ")[0]}</Link>
                  {r.address && <span className="block text-xs font-medium text-navy-900/55">{r.address}</span>}
                </th>
                {utilities.includes("electricity") && <td className="px-4 py-3"><StatusCell s={r.electricity} /></td>}
                {utilities.includes("gas") && <td className="px-4 py-3"><StatusCell s={r.gas} /></td>}
                {utilities.includes("electricity") && <td className="px-4 py-3 font-mono text-xs">{r.mpan ?? <span className="font-sans text-navy-900/40">Pending</span>}</td>}
                {utilities.includes("gas") && <td className="px-4 py-3 font-mono text-xs">{r.mprn ?? <span className="font-sans text-navy-900/40">Pending</span>}</td>}
                <td className="px-4 py-3">{r.supplier ?? <span className="text-navy-900/40">—</span>}</td>
                <td className="px-4 py-3">{r.appointment ?? <span className="text-navy-900/40">Not booked</span>}</td>
                <td className="px-4 py-3">
                  {r.actions.length ? (
                    <ul className="space-y-1">
                      {r.actions.map((a) => (
                        <li key={a} className="flex gap-1.5 font-semibold text-coral-800"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{a}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-navy-900/40">None</span>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-navy-900/60">No plots match that filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AddPlots({ projectId, nextNumber, baseName, plotWord }: { projectId: string; nextNumber: number; baseName: string; plotWord: string }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [names, setNames] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const defaults = Array.from({ length: count }, (_, i) => `${plotWord} ${nextNumber + i} — ${baseName}`);

  if (!open)
    return (
      <div>
        <button type="button" onClick={() => { setOpen(true); setMsg(null); }} className={buttonClass("secondary", "sm")}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add more {plotWord.toLowerCase()}s
        </button>
        {msg && <p role="status" className="mt-2 text-sm font-semibold text-emerald-800">{msg.text}</p>}
      </div>
    );
  return (
    <form
      className="w-full rounded-3xl bg-white p-5 shadow-card animate-rise"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await addPlots(projectId, defaults.map((d, i) => ({ name: names[i]?.trim() || d })));
          if (res.ok) {
            setMsg({ ok: true, text: `Added ${count} ${plotWord.toLowerCase()}${count === 1 ? "" : "s"}. We'll include them in your applications.` });
            setOpen(false);
            setNames([]);
            setCount(1);
          } else setMsg({ ok: false, text: res.error ?? "Something went wrong." });
        });
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold">Add {plotWord.toLowerCase()}s</h3>
        <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-navy-900/5" aria-label="Close"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      <label htmlFor="add-count" className="mt-3 block text-sm font-bold">How many?</label>
      <input id="add-count" type="number" min={1} max={20} value={count} onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} className="field-input mt-1 w-24" />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {defaults.map((d, i) => (
          <div key={i}>
            <label className="sr-only" htmlFor={`add-${i}`}>Name for new {plotWord.toLowerCase()} {i + 1}</label>
            <input id={`add-${i}`} className="field-input py-2 text-sm" placeholder={d} value={names[i] ?? ""} onChange={(e) => setNames((n) => { const c = [...n]; c[i] = e.target.value; return c; })} />
          </div>
        ))}
      </div>
      <button disabled={pending} className={buttonClass("primary", "sm", "mt-4")}>{pending ? "Adding…" : `Add ${count}`}</button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm font-semibold ${msg.ok ? "text-emerald-800" : "text-coral-700"}`}>{msg.text}</p>}
    </form>
  );
}
