import Link from "next/link";
import { ArrowLeft, Check, Eye, Lock, MessageSquare } from "lucide-react";
import {
  addNote,
  addTask,
  assignOwner,
  bookAppointment,
  requestInformation,
  selectSupplier,
  setAppointmentStatus,
  setDocumentStatus,
  setProjectStatus,
  toggleTask,
  updateConnectionDetails,
  updateQuotation,
} from "@/app/actions/admin";
import { DocumentUploader } from "@/components/documents";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PlotTable } from "@/components/plot-table";
import { Pill, ResponsibilityBadge, UtilityChip } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { readDb } from "@/lib/db/store";
import type { Connection } from "@/lib/db/types";
import {
  currentMilestone,
  currentStage,
  DOCUMENT_CATEGORY,
  formatDate,
  formatDateTime,
  formatPounds,
  isComplete,
  METER_NUMBER,
  MILESTONES,
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
  STARTING_POINT_LABEL,
  timeAgo,
  UTILITY_LABEL,
} from "@/lib/domain";
import { plotRows } from "@/lib/repo/plot-rows";
import { projectDetail } from "@/lib/repo/views";
import { recommendSuppliers } from "@/lib/suppliers";
import { MilestoneEditor } from "./milestone-editor";

export const dynamic = "force-dynamic";

const box = "rounded-2xl bg-white p-5 shadow-card";
const inp = "field-input py-2 text-sm";
const lbl = "text-xs font-bold";

export default async function CasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ plot?: string }> }) {
  const { id } = await params;
  const { plot: plotParam } = await searchParams;
  const admin = await requireAdmin();
  const db = await readDb();
  const d = projectDetail(db, admin, id);
  const { project: p, summary: s } = d;
  const multi = d.plots.length > 1;
  const row = d.rows.find((r) => r.plot.id === plotParam) ?? d.rows[0];
  const conns = Object.values(row.connections).filter(Boolean) as Connection[];
  const plotName = (pid?: string) => d.plots.find((x) => x.id === pid)?.name;
  const recs = recommendSuppliers(d.suppliers, p, d.connections);
  const supplier = d.suppliers.find((x) => x.id === p.supplierId);
  const now = Date.now();
  const internalTasks = d.tasks.filter((t) => t.audience === "internal");
  const customerTasks = d.tasks.filter((t) => t.audience === "customer");
  const req = p.requirements;

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-bold text-navy-900/60 hover:text-navy-900"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> All requests</Link>

      {/* Header */}
      <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold">{p.reference}</span>
            <Pill tone={p.status === "awaiting_customer" ? "coral" : p.status === "completed" ? "green" : p.status === "submitted" ? "lime" : "sky"}>{PROJECT_STATUS_LABEL[p.status]}</Pill>
            {p.utilities.map((u) => <UtilityChip key={u} utility={u} />)}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{p.name}{multi && <span className="text-navy-900/50"> · {d.plots.length} plots</span>}</h1>
          <p className="text-sm text-navy-900/65">
            {PROJECT_TYPE_LABEL[p.projectType]} · {[p.addressLine ?? p.siteDescription, p.town, p.postcode].filter(Boolean).join(", ")} · Submitted {formatDate(p.createdAt)} ({timeAgo(p.createdAt)})
          </p>
          <p className="mt-1 text-sm">
            <strong>{d.customer?.name}</strong>{d.organisation && d.organisation.name !== d.customer?.name && ` (${d.organisation.name})`} · {d.customer?.email}{d.customer?.phone && ` · ${d.customer.phone}`}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-navy-700" title="This is what the customer sees on their dashboard">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Customer sees: “{s.headline}” · {s.progress}%
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:w-[32rem]">
          <ActionForm action={assignOwner} className={`${box} p-4`}>
            <input type="hidden" name="projectId" value={p.id} />
            <label htmlFor="ownerId" className={lbl}>Case owner</label>
            <div className="mt-1 flex gap-2">
              <select id="ownerId" name="ownerId" defaultValue={p.caseOwnerId ?? ""} className={inp}>
                <option value="">Unassigned</option>
                {d.staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <SubmitButton size="sm" variant="dark">Save</SubmitButton>
            </div>
          </ActionForm>
          <ActionForm action={setProjectStatus} className={`${box} p-4`}>
            <input type="hidden" name="projectId" value={p.id} />
            <label htmlFor="pstatus" className={lbl}>Case status</label>
            <div className="mt-1 flex gap-2">
              <select id="pstatus" name="status" defaultValue={p.status} className={inp}>
                {Object.entries(PROJECT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <SubmitButton size="sm" variant="dark">Set</SubmitButton>
            </div>
            <label htmlFor="preason" className="sr-only">Reason</label>
            <input id="preason" name="reason" placeholder="Reason (e.g. for withdrawal)" className={`${inp} mt-2`} />
          </ActionForm>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-6">
          {/* Plots */}
          {multi && (
            <section className={box} aria-labelledby="plots-title">
              <h2 id="plots-title" className="font-extrabold">Plots</h2>
              <p className="mb-3 text-sm text-navy-900/60">Pick a plot to edit its connections below.</p>
              <PlotTable projectId={p.id} rows={plotRows(d)} utilities={p.utilities} plotWord={p.projectType === "conversion" ? "Unit" : "Plot"} />
            </section>
          )}

          {/* Connections */}
          <section id="timeline" className="scroll-mt-4" aria-labelledby="conn-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="conn-title" className="text-xl font-extrabold">Connections{multi && <> · {row.plot.name}</>}</h2>
              {multi && (
                <nav aria-label="Choose plot" className="flex max-w-full gap-1 overflow-x-auto">
                  {d.plots.map((x) => (
                    <Link key={x.id} href={`?plot=${x.id}#timeline`} scroll={false} aria-current={x.id === row.plot.id ? "page" : undefined} className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${x.id === row.plot.id ? "bg-navy-900 text-white" : "bg-white ring-1 ring-navy-900/10"}`}>
                      {x.name.split(" — ")[0]}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
            <div className="mt-3 grid gap-4 2xl:grid-cols-2">
              {conns.map((c) => {
                const cur = currentMilestone(c);
                const meter = METER_NUMBER[c.utility];
                return (
                  <article key={c.id} className={box} aria-label={`${UTILITY_LABEL[c.utility]} connection`}>
                    <div className="flex items-center justify-between gap-2">
                      <UtilityChip utility={c.utility} />
                      <span className="text-sm font-bold">{isComplete(c) ? "Connected" : `Stage ${currentStage(c)}/6`}</span>
                    </div>
                    <ol className="mt-3 space-y-1 text-sm">
                      {MILESTONES.map((def, i) => {
                        const m = c.milestones.find((x) => x.key === def.key)!;
                        return (
                          <li key={def.key} className="flex items-center gap-2">
                            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${m.state === "complete" ? "bg-lime-400" : m.state === "in_progress" ? "bg-navy-900 text-white" : "bg-navy-900/10"}`}>{m.state === "complete" ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}</span>
                            <span className={m.state === "not_started" ? "text-navy-900/50" : "font-semibold"}>{def.title}</span>
                            {m.state === "in_progress" && <ResponsibilityBadge who={m.responsible} className="ml-auto" />}
                            {m.confirmedDate && m.state !== "complete" && <span className="text-xs font-bold text-lime-700">{formatDate(m.confirmedDate)}</span>}
                          </li>
                        );
                      })}
                    </ol>
                    <details className="mt-4 rounded-xl bg-navy-50 p-3" open>
                      <summary className="cursor-pointer text-sm font-bold">Update milestone</summary>
                      <div className="mt-3"><MilestoneEditor connectionId={c.id} milestones={c.milestones} currentKey={cur.key} multi={multi} /></div>
                    </details>
                    <details className="mt-2 rounded-xl bg-navy-50 p-3">
                      <summary className="cursor-pointer text-sm font-bold">Network & meter details</summary>
                      <ActionForm action={updateConnectionDetails} className="mt-3 grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="connectionId" value={c.id} />
                        <div className="sm:col-span-2">
                          <label htmlFor={`op-${c.id}`} className={lbl}>{c.utility === "electricity" ? "DNO" : "GDN"}</label>
                          <select id={`op-${c.id}`} name="networkOperatorId" defaultValue={c.networkOperatorId ?? ""} className={inp}>
                            <option value="">Not set</option>
                            {d.operators.filter((o) => (c.utility === "electricity" ? ["DNO", "IDNO"] : ["GDN", "IGT"]).includes(o.kind)).map((o) => <option key={o.id} value={o.id}>{o.name} — {o.area}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`ref-${c.id}`} className={lbl}>Network reference</label>
                          <input id={`ref-${c.id}`} name="networkReference" defaultValue={c.networkReference} className={inp} />
                        </div>
                        <div>
                          <label htmlFor={`mpn-${c.id}`} className={lbl}>{meter.short} <span className="font-normal text-navy-900/50">(this plot)</span></label>
                          <input id={`mpn-${c.id}`} name="meterPointNumber" defaultValue={c.meterPointNumber} inputMode="numeric" className={`${inp} font-mono`} />
                        </div>
                        <div className="flex items-center gap-3 sm:col-span-2">
                          {multi && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="applyAll" className="h-4 w-4 accent-navy-900" /> Operator & reference for all plots</label>}
                          <SubmitButton size="sm" variant="dark" className="ml-auto">Save details</SubmitButton>
                        </div>
                      </ActionForm>
                    </details>
                    <details className="mt-2 rounded-xl bg-navy-50 p-3">
                      <summary className="cursor-pointer text-sm font-bold">Quotation {c.quotation && <span className="font-normal">· {c.quotation.status}{c.quotation.amountPence !== undefined && ` · ${formatPounds(c.quotation.amountPence)}`}</span>}</summary>
                      <ActionForm action={updateQuotation} className="mt-3 grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="connectionId" value={c.id} />
                        <div>
                          <label htmlFor={`qs-${c.id}`} className={lbl}>Status</label>
                          <select id={`qs-${c.id}`} name="status" defaultValue={c.quotation?.status ?? "awaiting"} className={inp}>
                            {["awaiting", "received", "accepted", "paid", "expired", "declined"].map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`qa-${c.id}`} className={lbl}>Amount (£)</label>
                          <input id={`qa-${c.id}`} name="amount" inputMode="decimal" defaultValue={c.quotation?.amountPence !== undefined ? (c.quotation.amountPence / 100).toFixed(2) : ""} className={inp} />
                        </div>
                        <div>
                          <label htmlFor={`qv-${c.id}`} className={lbl}>Valid until</label>
                          <input id={`qv-${c.id}`} name="validUntil" type="date" defaultValue={c.quotation?.validUntil?.slice(0, 10)} className={inp} />
                        </div>
                        <div>
                          <label htmlFor={`qn-${c.id}`} className={lbl}>Notes</label>
                          <input id={`qn-${c.id}`} name="notes" defaultValue={c.quotation?.notes} className={inp} />
                        </div>
                        <div className="flex items-center gap-3 sm:col-span-2">
                          {multi && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="applyAll" className="h-4 w-4 accent-navy-900" /> Apply to all plots</label>}
                          <SubmitButton size="sm" variant="dark" className="ml-auto">Save quotation</SubmitButton>
                        </div>
                      </ActionForm>
                    </details>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Appointments */}
          <section className={box} aria-labelledby="appt-title">
            <h2 id="appt-title" className="font-extrabold">Appointments</h2>
            <ul className="mt-3 divide-y divide-navy-900/5 text-sm">
              {d.appointments.sort((a, b) => b.date.localeCompare(a.date)).map((a) => {
                const c = d.connections.find((x) => x.id === a.connectionId);
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
                    <span className="font-bold">{formatDate(a.date, { weekday: "short" })} {a.slot?.toUpperCase()}</span>
                    <span>{a.kind === "meter_installation" ? "Meter installation" : "Network works"} · {c && UTILITY_LABEL[c.utility]}{multi && c && ` · ${plotName(c.plotId)}`}</span>
                    <Pill tone={a.status === "booked" ? "lime" : a.status === "completed" ? "green" : "neutral"}>{a.status}</Pill>
                    {a.status === "booked" && (
                      <span className="ml-auto flex gap-1">
                        <form action={setAppointmentStatus}><input type="hidden" name="appointmentId" value={a.id} /><input type="hidden" name="status" value="completed" /><SubmitButton size="sm" variant="secondary" pendingText="…">Mark done</SubmitButton></form>
                        <form action={setAppointmentStatus}><input type="hidden" name="appointmentId" value={a.id} /><input type="hidden" name="status" value="cancelled" /><SubmitButton size="sm" variant="ghost" pendingText="…">Cancel</SubmitButton></form>
                      </span>
                    )}
                  </li>
                );
              })}
              {d.appointments.length === 0 && <li className="py-2 text-navy-900/60">No appointments yet.</li>}
            </ul>
            <details className="mt-3 rounded-xl bg-navy-50 p-3">
              <summary className="cursor-pointer text-sm font-bold">Book an appointment</summary>
              <ActionForm action={bookAppointment} className="mt-3 grid gap-3 sm:grid-cols-3">
                <input type="hidden" name="projectId" value={p.id} />
                <div>
                  <label htmlFor="ap-plot" className={lbl}>Plot</label>
                  <select id="ap-plot" name="plotId" defaultValue={row.plot.id} className={inp}>{d.plots.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                </div>
                <div>
                  <label htmlFor="ap-kind" className={lbl}>Type</label>
                  <select id="ap-kind" name="kind" className={inp}><option value="meter_installation">Meter installation</option><option value="network_works">Network works</option></select>
                </div>
                <fieldset>
                  <legend className={lbl}>Utilities</legend>
                  <div className="mt-2 flex gap-3 text-sm">{p.utilities.map((u) => <label key={u} className="flex items-center gap-1.5"><input type="checkbox" name="utilities" value={u} defaultChecked className="h-4 w-4 accent-navy-900" /> {UTILITY_LABEL[u]}</label>)}</div>
                </fieldset>
                <div>
                  <label htmlFor="ap-date" className={lbl}>Confirmed date</label>
                  <input id="ap-date" name="date" type="date" required className={inp} />
                </div>
                <div>
                  <label htmlFor="ap-slot" className={lbl}>Slot</label>
                  <select id="ap-slot" name="slot" className={inp}><option value="am">Morning</option><option value="pm">Afternoon</option><option value="all_day">All day</option></select>
                </div>
                <div>
                  <label htmlFor="ap-notes" className={lbl}>Notes</label>
                  <input id="ap-notes" name="notes" className={inp} />
                </div>
                <div className="sm:col-span-3"><SubmitButton size="sm" variant="dark">Book and notify customer</SubmitButton></div>
              </ActionForm>
            </details>
          </section>

          {/* Application details */}
          <section className={box} aria-labelledby="app-title">
            <h2 id="app-title" className="font-extrabold">Application details</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {p.utilities.map((u) => (
                <div key={u}><dt className="text-navy-900/55">{UTILITY_LABEL[u]} starting point</dt><dd className="font-semibold">{p.startingPoint[u] ? STARTING_POINT_LABEL[p.startingPoint[u]!] : "—"}{p.existingReferences[u] && ` · ref ${p.existingReferences[u]}`}</dd></div>
              ))}
              <div><dt className="text-navy-900/55">Desired completion</dt><dd className="font-semibold">{req.desiredCompletionDate ? formatDate(req.desiredCompletionDate) : "Not given"}</dd></div>
              <div><dt className="text-navy-900/55">Site ready</dt><dd className="font-semibold">{req.siteReady ?? "—"}</dd></div>
              {req.occupied && <div><dt className="text-navy-900/55">Occupied</dt><dd className="font-semibold">{req.occupied}</dd></div>}
              {req.electricity && p.utilities.includes("electricity") && <div><dt className="text-navy-900/55">Electricity</dt><dd className="font-semibold">Phase: {req.electricity.phase ?? "—"} · EV: {req.electricity.evCharger ?? "—"} · Heat pump: {req.electricity.heatPump ?? "—"} · Meter: {req.electricity.meterLocation ?? "—"}</dd></div>}
              {req.gas && p.utilities.includes("gas") && <div><dt className="text-navy-900/55">Gas</dt><dd className="font-semibold">Usage: {req.gas.usage ?? "—"} · Meter: {req.gas.meterLocation ?? "—"}</dd></div>}
              <div><dt className="text-navy-900/55">Site contact</dt><dd className="font-semibold">{p.siteContact?.name} {p.siteContact?.phone} {p.siteContact?.email}</dd></div>
              <div><dt className="text-navy-900/55">Access / notes</dt><dd className="font-semibold">{req.accessNotes || "—"}</dd></div>
              <div><dt className="text-navy-900/55">Also interested in</dt><dd className="font-semibold">{p.interestedIn.join(", ") || "—"}</dd></div>
              <div><dt className="text-navy-900/55">Permission to act</dt><dd className="font-semibold">{p.consent.authorised ? `Given by ${p.consent.name}, ${formatDateTime(p.consent.at)}` : "Not given"}</dd></div>
            </dl>
          </section>

          {/* Documents */}
          <section className={box} aria-labelledby="docs-title">
            <h2 id="docs-title" className="font-extrabold">Documents ({d.documents.length})</h2>
            <ul className="mt-3 divide-y divide-navy-900/5 text-sm">
              {d.documents.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-center gap-2 py-2">
                  <a href={`/api/documents/${doc.id}`} target="_blank" rel="noreferrer" className="font-bold underline">{doc.filename}</a>
                  <span className="text-navy-900/60">{DOCUMENT_CATEGORY[doc.category].label}{doc.plotId && ` · ${plotName(doc.plotId)}`} · {d.users[doc.uploadedById]} · {timeAgo(doc.createdAt)}</span>
                  <Pill tone={doc.status === "accepted" ? "green" : doc.status === "needs_replacement" ? "coral" : "neutral"}>{doc.status.replace("_", " ")}</Pill>
                  <span className="ml-auto flex gap-1">
                    <form action={setDocumentStatus}><input type="hidden" name="documentId" value={doc.id} /><input type="hidden" name="status" value="accepted" /><SubmitButton size="sm" variant="secondary" pendingText="…">Accept</SubmitButton></form>
                    <form action={setDocumentStatus}><input type="hidden" name="documentId" value={doc.id} /><input type="hidden" name="status" value="needs_replacement" /><SubmitButton size="sm" variant="ghost" pendingText="…">Ask to replace</SubmitButton></form>
                  </span>
                </li>
              ))}
              {d.documents.length === 0 && <li className="py-2 text-navy-900/60">No documents uploaded yet.</li>}
            </ul>
            <div className="mt-3"><DocumentUploader projectId={p.id} plots={d.plots.map((x) => ({ id: x.id, name: x.name }))} label="Upload on customer's behalf" /></div>
          </section>

          {/* History */}
          <section className={box} aria-labelledby="hist-title">
            <h2 id="hist-title" className="font-extrabold">History of changes</h2>
            <ol className="mt-3 max-h-96 space-y-2 overflow-y-auto text-sm">
              {d.history.map((h) => (
                <li key={h.id} className="rounded-xl bg-navy-50 px-3 py-2">
                  <p><strong>{h.summary}</strong>{h.before && <> · <span className="text-navy-900/50 line-through">{h.before}</span></>}{h.after && <> → {h.after}</>}</p>
                  <p className="text-xs text-navy-900/55">{d.users[h.actorId]} · {formatDateTime(h.createdAt)}</p>
                </li>
              ))}
              {d.history.length === 0 && <li className="text-navy-900/60">No changes recorded yet.</li>}
            </ol>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className={`${box} ring-2 ring-coral-200`} aria-labelledby="ri-title">
            <h2 id="ri-title" className="font-extrabold">Request information</h2>
            <p className="text-sm text-navy-900/60">Creates an “Over to you” action in the customer&apos;s portal and notifies them.</p>
            <ActionForm action={requestInformation} className="mt-3 space-y-2" resetOnSuccess>
              <input type="hidden" name="projectId" value={p.id} />
              <label htmlFor="ri-t" className={lbl}>What do you need?</label>
              <input id="ri-t" name="title" required className={inp} placeholder="E.g. Upload a photo of the meter box" />
              <label htmlFor="ri-d" className={lbl}>Details for the customer</label>
              <textarea id="ri-d" name="detail" rows={2} className={inp} />
              <label htmlFor="ri-c" className={lbl}>Document type (adds an upload button)</label>
              <select id="ri-c" name="documentCategory" className={inp}>
                <option value="">None — just an action</option>
                {Object.entries(DOCUMENT_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {multi && (
                <fieldset>
                  <legend className={lbl}>For plots (optional)</legend>
                  <div className="mt-1 flex max-h-28 flex-wrap gap-2 overflow-y-auto text-xs">
                    {d.plots.map((x) => <label key={x.id} className="flex items-center gap-1"><input type="checkbox" name="plotIds" value={x.id} className="accent-navy-900" /> {x.name.split(" — ")[0]}</label>)}
                  </div>
                </fieldset>
              )}
              <SubmitButton size="sm" variant="danger">Send request</SubmitButton>
            </ActionForm>
          </section>

          <section className={box} aria-labelledby="tasks-title">
            <h2 id="tasks-title" className="font-extrabold">Tasks</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {internalTasks.map((t) => {
                const overdue = t.status === "open" && t.dueDate && new Date(t.dueDate).getTime() < now;
                return (
                  <li key={t.id} className="flex items-start gap-2">
                    <form action={toggleTask}><input type="hidden" name="taskId" value={t.id} /><button className={`mt-0.5 grid h-5 w-5 place-items-center rounded-md border-2 ${t.status === "done" ? "border-lime-500 bg-lime-400" : "border-navy-900/30"}`} aria-label={`${t.status === "done" ? "Reopen" : "Complete"}: ${t.title}`}>{t.status === "done" && <Check className="h-3 w-3" aria-hidden="true" />}</button></form>
                    <span className={t.status === "done" ? "text-navy-900/45 line-through" : ""}>
                      {t.title}
                      <span className={`block text-xs ${overdue ? "font-bold text-coral-700" : "text-navy-900/50"}`}>{d.users[t.assigneeId ?? ""] ?? "Unassigned"}{t.dueDate && ` · due ${formatDate(t.dueDate)}`}{overdue && " · overdue"}</span>
                      {t.detail && <span className="block text-xs text-navy-900/50">{t.detail}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            <ActionForm action={addTask} className="mt-3 space-y-2 border-t border-navy-900/5 pt-3" resetOnSuccess>
              <input type="hidden" name="projectId" value={p.id} />
              <label htmlFor="tk-t" className="sr-only">New task</label>
              <input id="tk-t" name="title" placeholder="New task or reminder…" className={inp} />
              <div className="flex gap-2">
                <label htmlFor="tk-a" className="sr-only">Assignee</label>
                <select id="tk-a" name="assigneeId" defaultValue={admin.id} className={inp}>{d.staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                <label htmlFor="tk-d" className="sr-only">Due date</label>
                <input id="tk-d" name="dueDate" type="date" className={inp} />
              </div>
              <SubmitButton size="sm" variant="dark">Add task</SubmitButton>
            </ActionForm>
            {customerTasks.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-extrabold">Customer actions</h3>
                <ul className="mt-1 space-y-1.5 text-sm">
                  {customerTasks.map((t) => (
                    <li key={t.id} className="flex items-start gap-2">
                      <form action={toggleTask}><input type="hidden" name="taskId" value={t.id} /><button className={`mt-0.5 grid h-5 w-5 place-items-center rounded-md border-2 ${t.status === "done" ? "border-lime-500 bg-lime-400" : "border-coral-400"}`} aria-label={`${t.status === "done" ? "Reopen" : "Mark complete"}: ${t.title}`}>{t.status === "done" && <Check className="h-3 w-3" aria-hidden="true" />}</button></form>
                      <span className={t.status === "done" ? "text-navy-900/45 line-through" : ""}>{t.title}{t.plotIds && <span className="block text-xs text-navy-900/50">{t.plotIds.map(plotName).join(", ")}</span>}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className={box} aria-labelledby="sup-title">
            <h2 id="sup-title" className="font-extrabold">Supplier</h2>
            <p className="text-sm">Current: <strong>{supplier?.name ?? "Not selected"}</strong></p>
            <p className="mt-1 text-xs text-navy-900/55">Ranked on suitability only — fuel, capabilities, verified lead times and availability. Referral arrangements are never part of the score.</p>
            <ActionForm action={selectSupplier} className="mt-3 space-y-2">
              <input type="hidden" name="projectId" value={p.id} />
              <fieldset className="space-y-2">
                <legend className="sr-only">Choose a supplier</legend>
                {recs.map((r, i) => (
                  <label key={r.supplier.id} className={`block rounded-xl p-3 text-sm ring-1 ${r.eligible ? "ring-navy-900/10 has-[:checked]:ring-2 has-[:checked]:ring-navy-900" : "opacity-60 ring-navy-900/5"}`}>
                    <span className="flex items-center gap-2">
                      <input type="radio" name="supplierId" value={r.supplier.id} disabled={!r.eligible} defaultChecked={p.supplierId ? p.supplierId === r.supplier.id : i === 0 && r.eligible} className="accent-navy-900" />
                      <strong>{r.supplier.name}</strong>
                      {i === 0 && r.eligible && <Pill tone="lime">Best fit</Pill>}
                      <span className="ml-auto text-xs text-navy-900/50">score {r.score}</span>
                    </span>
                    <span className="mt-1 block text-xs text-emerald-800">{r.reasons.join(" · ")}</span>
                    {r.warnings.length > 0 && <span className="block text-xs text-coral-700">{r.warnings.join(" · ")}</span>}
                  </label>
                ))}
              </fieldset>
              <label htmlFor="sup-r" className={lbl}>Reason (shared with customer)</label>
              <input id="sup-r" name="reason" className={inp} placeholder="E.g. Best availability for multi-plot meter fits" />
              <SubmitButton size="sm" variant="dark">Record supplier</SubmitButton>
            </ActionForm>
          </section>

          <section className={box} aria-labelledby="notes-title">
            <h2 id="notes-title" className="font-extrabold">Notes & messages</h2>
            <ActionForm action={addNote} className="mt-2 space-y-2" resetOnSuccess>
              <input type="hidden" name="projectId" value={p.id} />
              <label htmlFor="nt-b" className="sr-only">Note</label>
              <textarea id="nt-b" name="body" rows={3} className={inp} placeholder="Write a note…" />
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-1.5"><input type="radio" name="visibility" value="internal" defaultChecked className="accent-navy-900" /> <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Internal only</label>
                <label className="flex items-center gap-1.5"><input type="radio" name="visibility" value="customer" className="accent-navy-900" /> <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Customer can see</label>
              </div>
              <SubmitButton size="sm" variant="dark">Save note</SubmitButton>
            </ActionForm>
            <ul className="mt-3 space-y-2 text-sm">
              {d.notes.map((n) => (
                <li key={n.id} className={`rounded-xl p-3 ${n.visibility === "internal" ? "bg-amber-50" : "bg-lime-100"}`}>
                  <p className="text-xs font-bold">{n.visibility === "internal" ? "🔒 Internal" : "💬 Customer-visible"} · {d.users[n.authorId]} · {timeAgo(n.createdAt)}</p>
                  <p className="mt-1">{n.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className={box} aria-labelledby="act-title">
            <h2 id="act-title" className="font-extrabold">Activity</h2>
            <ol className="mt-2 max-h-[28rem] space-y-2 overflow-y-auto text-sm">
              {d.activity.map((a) => (
                <li key={a.id} className="border-l-2 pl-3" style={{ borderColor: a.visibility === "internal" ? "#f59e0b" : "#a9d61a" }}>
                  <p>{a.visibility === "internal" && <span className="mr-1 text-xs font-bold text-amber-700">Internal</span>}{a.message}</p>
                  <p className="text-xs text-navy-900/50">{formatDateTime(a.createdAt)}{a.actorId && ` · ${d.users[a.actorId]}`}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
