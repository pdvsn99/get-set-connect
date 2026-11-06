import Link from "next/link";
import { ArrowLeft, CalendarCheck, CircleAlert, Clock, Compass, Hash, MapPin, MessageSquareText, PartyPopper, Sparkles } from "lucide-react";
import { Sparky } from "@/components/brand";
import { DocumentList, DocumentUploader, type DocView } from "@/components/documents";
import { AddPlots, PlotTable } from "@/components/plot-table";
import { ConnectionTimeline } from "@/components/timeline";
import { Card, Pill, ProgressBar, StageDots, UtilityChip } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { readDb } from "@/lib/db/store";
import { currentMilestone, DOCUMENT_CATEGORY, formatDate, formatDateTime, isComplete, MILESTONES, timeAgo, UTILITY_LABEL } from "@/lib/domain";
import { plotRows } from "@/lib/repo/plot-rows";
import { projectDetail } from "@/lib/repo/views";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ plot?: string; welcome?: string }>;
}) {
  const { id } = await params;
  const { plot: plotParam, welcome } = await searchParams;
  const user = await requireCustomer();
  const db = await readDb();
  const d = projectDetail(db, user, id);
  const { project: p, summary: s } = d;
  const multi = d.plots.length > 1;
  const plotWord = p.projectType === "conversion" ? "Unit" : "Plot";
  const selected = d.rows.find((r) => r.plot.id === plotParam) ?? d.rows[0];
  const openTasks = d.tasks.filter((t) => t.status === "open" && t.audience === "customer");
  const plotName = (pid?: string) => d.plots.find((x) => x.id === pid)?.name;
  const done = s.progress === 100 || p.status === "completed";

  // "What happens next?" — explained from the slowest connection's next step.
  const conns = selected ? (Object.values(selected.connections).filter(Boolean) as typeof d.connections) : [];
  const nextStep = (() => {
    const pending = d.connections.filter((c) => !isComplete(c));
    if (!pending.length) return null;
    const slowest = pending.sort((a, b) => a.milestones.filter((m) => m.state === "complete").length - b.milestones.filter((m) => m.state === "complete").length)[0];
    const m = currentMilestone(slowest);
    const def = MILESTONES.find((x) => x.key === m.key)!;
    return { title: def.title, explainer: def.explainer, utility: slowest.utility, note: m.note };
  })();

  const docs: DocView[] = d.documents.map((doc) => ({
    id: doc.id,
    filename: doc.filename,
    category: doc.category,
    mimeType: doc.mimeType,
    size: doc.size,
    plotName: plotName(doc.plotId),
    status: doc.status,
    createdAt: doc.createdAt,
    uploadedLabel: `${d.users[doc.uploadedById] === user.name ? "You" : "Get Set Connect"} · ${timeAgo(doc.createdAt)}`,
  }));
  const plotOptions = d.plots.map((x) => ({ id: x.id, name: x.name }));

  return (
    <>
      <Link href="/portal" className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-bold text-navy-900/70 hover:bg-navy-900/5">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> My Connections
      </Link>

      {welcome && (
        <div className="mt-4 flex items-center gap-4 rounded-3xl bg-lime-300 p-5 animate-rise" role="status">
          <Sparky className="h-20 w-20 shrink-0" mood="cheer" />
          <div>
            <p className="text-xl font-extrabold">You&apos;re all set! We&apos;ve got your request.</p>
            <p className="text-navy-900/80">Now let us take care of the complicated bits. We&apos;ll review everything and update you here — usually within one working day.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="navy"><Hash className="h-3 w-3" aria-hidden="true" />{p.reference}</Pill>
            {p.utilities.map((u) => <UtilityChip key={u} utility={u} />)}
            {p.status === "withdrawn" && <Pill tone="coral">Withdrawn</Pill>}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            {p.name}
            {multi && <span className="text-navy-900/50"> — {d.plots.length} {p.projectType === "conversion" ? "units" : "new homes"}</span>}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-navy-900/65">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {[p.addressLine ?? p.siteDescription, p.town, p.postcode].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="w-full max-w-xs">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>{done ? "Complete" : `Stage ${s.stage} of 6`}</span>
            <span>{s.progress}%</span>
          </div>
          <ProgressBar value={s.progress} label="Overall progress" className="mt-2" />
        </div>
      </div>

      {/* The three questions */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-navy-900/60"><Sparkles className="h-4 w-4" aria-hidden="true" /> What&apos;s happening?</p>
          <p className="mt-2 text-lg font-extrabold">{s.headline}</p>
          <div className="mt-3"><StageDots stage={s.stage} complete={done} /></div>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-navy-900/60"><Compass className="h-4 w-4" aria-hidden="true" /> What happens next?</p>
          {done ? (
            <p className="mt-2 flex items-center gap-2 text-lg font-extrabold"><PartyPopper className="h-5 w-5" aria-hidden="true" /> All connected. Happy days!</p>
          ) : nextStep ? (
            <>
              <p className="mt-2 text-lg font-extrabold">{nextStep.title}</p>
              <p className="mt-1 text-sm text-navy-900/70">{nextStep.note ?? nextStep.explainer}</p>
            </>
          ) : null}
          {!done && (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-cream-100 px-3 py-2 text-sm font-semibold">
              {s.nextMilestone ? (
                <><CalendarCheck className="h-4 w-4 text-lime-700" aria-hidden="true" /> {s.nextMilestone.label}: {formatDate(s.nextMilestone.date, { weekday: "short" })}{multi && s.nextMilestone.plotName ? ` · ${s.nextMilestone.plotName}` : ""}</>
              ) : (
                <><Clock className="h-4 w-4" aria-hidden="true" /> Next date awaiting confirmation</>
              )}
            </p>
          )}
        </Card>
        <Card className={`p-5 ${openTasks.length ? "ring-2 ring-coral-400" : ""}`}>
          <p className="flex items-center gap-2 text-sm font-bold text-navy-900/60"><CircleAlert className="h-4 w-4" aria-hidden="true" /> Do I need to do anything?</p>
          {openTasks.length ? (
            <p className="mt-2 text-lg font-extrabold text-coral-700">Over to you — {openTasks.length} thing{openTasks.length === 1 ? "" : "s"} to do</p>
          ) : (
            <p className="mt-2 text-lg font-extrabold">Nope! Leave it with us.</p>
          )}
          <p className="mt-1 text-sm text-navy-900/70">{openTasks.length ? "See below — it only takes a minute." : "We'll let you know if we need anything."}</p>
        </Card>
      </div>

      {/* Actions */}
      {openTasks.length > 0 && (
        <section className="mt-6 space-y-3" aria-labelledby="actions-title">
          <h2 id="actions-title" className="sr-only">Actions for you</h2>
          {openTasks.map((t) => (
            <div key={t.id} className="rounded-3xl bg-coral-50 p-5 ring-1 ring-coral-200 animate-rise">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-coral-700">Over to you — we need one more thing</p>
                  <p className="mt-0.5 text-lg font-extrabold">{t.title}</p>
                  {t.detail && <p className="mt-1 text-navy-900/75">{t.detail}</p>}
                  {t.plotIds && <p className="mt-1 text-sm font-semibold">For: {t.plotIds.map(plotName).join(", ")}</p>}
                </div>
                {t.documentCategory && (
                  <div className="flex shrink-0 flex-col gap-2">
                    {(t.plotIds ?? [undefined]).map((pid) => (
                      <DocumentUploader
                        key={pid ?? "all"}
                        compact
                        projectId={p.id}
                        plots={plotOptions}
                        defaultCategory={t.documentCategory}
                        defaultPlotId={pid}
                        taskId={t.plotIds && t.plotIds.length > 1 ? undefined : t.id}
                        label={pid ? `Upload for ${plotName(pid)?.split(" — ")[0]}` : `Upload ${DOCUMENT_CATEGORY[t.documentCategory!].label.toLowerCase()}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Developer view */}
      {multi && (
        <section className="mt-12" aria-labelledby="dev-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="dev-title" className="text-2xl font-extrabold">Development overview</h2>
              <p className="text-navy-900/70">Every {plotWord.toLowerCase()} at a glance. Click one to see its full timeline.</p>
            </div>
            <AddPlots projectId={p.id} nextNumber={Math.max(...d.plots.map((x) => x.number)) + 1} baseName={p.name} plotWord={plotWord} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {p.utilities.map((u) => {
              const st = s.utilityStatus[u]!;
              return (
                <Card key={u} className="p-4">
                  <p className="text-sm font-bold text-navy-900/60">{UTILITY_LABEL[u]} connected</p>
                  <p className="mt-1 text-3xl font-extrabold">{st.complete}<span className="text-lg text-navy-900/40">/{st.total}</span></p>
                </Card>
              );
            })}
            <Card className="p-4">
              <p className="text-sm font-bold text-navy-900/60">Meter appointments</p>
              <p className="mt-1 text-3xl font-extrabold">{d.appointments.filter((a) => a.status === "booked").length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-bold text-navy-900/60">Actions for you</p>
              <p className={`mt-1 text-3xl font-extrabold ${openTasks.length ? "text-coral-600" : ""}`}>{openTasks.length}</p>
            </Card>
          </div>
          <div className="mt-5">
            <PlotTable projectId={p.id} rows={plotRows(d)} utilities={p.utilities} plotWord={plotWord} />
          </div>
        </section>
      )}

      {/* Timelines */}
      <section id="timeline" className="mt-12 scroll-mt-24" aria-labelledby="tl-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="tl-title" className="text-2xl font-extrabold">{multi ? `${selected.plot.name}` : "Your connection timeline"}</h2>
            <p className="text-navy-900/70">Electricity and gas move at their own pace, so they each have their own timeline.</p>
          </div>
          {multi && (
            <nav aria-label={`Choose a ${plotWord.toLowerCase()}`} className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
              {d.plots.map((x) => (
                <Link key={x.id} href={`?plot=${x.id}#timeline`} scroll={false} aria-current={x.id === selected.plot.id ? "page" : undefined} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ${x.id === selected.plot.id ? "bg-navy-900 text-white" : "bg-white ring-1 ring-navy-900/10 hover:ring-navy-900/30"}`}>
                  {x.name.split(" — ")[0]}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className={`mt-5 grid gap-5 ${conns.length > 1 ? "lg:grid-cols-2" : "max-w-2xl"}`}>
          {conns.map((c) => (
            <ConnectionTimeline key={c.id} connection={c} operators={d.operators} suppliers={d.suppliers} appointments={d.appointments} />
          ))}
        </div>
      </section>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Activity */}
        <section aria-labelledby="activity-title">
          <h2 id="activity-title" className="text-2xl font-extrabold">Latest updates</h2>
          <Card className="mt-4 p-5">
            <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[0.6rem] before:w-0.5 before:bg-navy-900/10">
              {d.activity.slice(0, 25).map((a) => (
                <li key={a.id} className="relative pl-9">
                  <span className={`absolute top-1 left-0 grid h-5 w-5 place-items-center rounded-full ring-4 ring-white ${a.message.startsWith("We need") ? "bg-coral-500" : a.utility === "gas" ? "bg-coral-300" : "bg-lime-400"}`} aria-hidden="true" />
                  <p className="font-semibold">{a.message}</p>
                  <p className="text-xs text-navy-900/55">
                    <time dateTime={a.createdAt}>{formatDateTime(a.createdAt)}</time>
                    {a.utility && ` · ${UTILITY_LABEL[a.utility]}`}
                    {multi && a.plotId && ` · ${plotName(a.plotId)}`}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
          {d.notes.length > 0 && (
            <>
              <h3 className="mt-8 flex items-center gap-2 text-lg font-extrabold"><MessageSquareText className="h-5 w-5" aria-hidden="true" /> Messages from the team</h3>
              <ul className="mt-3 space-y-3">
                {d.notes.map((n) => (
                  <li key={n.id} className="rounded-2xl bg-white p-4 shadow-card">
                    <p>{n.body}</p>
                    <p className="mt-1 text-xs text-navy-900/55">{d.users[n.authorId]} · {formatDateTime(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Documents */}
        <section aria-labelledby="docs-title">
          <h2 id="docs-title" className="text-2xl font-extrabold">Documents</h2>
          <div className="mt-4 space-y-4">
            <DocumentUploader projectId={p.id} plots={plotOptions} defaultPlotId={multi ? selected.plot.id : undefined} />
            <Card className="p-5">
              <DocumentList projectId={p.id} docs={docs} canEdit />
            </Card>
          </div>
          <div className="mt-6 rounded-2xl bg-cream-200 p-4 text-sm text-navy-900/75">
            <p className="font-bold text-navy-900">Your details</p>
            <p className="mt-1">Site contact: {p.siteContact?.name ?? "—"} {p.siteContact?.phone && `· ${p.siteContact.phone}`}</p>
            <p>Requested by: {p.requirements.desiredCompletionDate ? formatDate(p.requirements.desiredCompletionDate) : "No date given"}</p>
            <p>Submitted: {formatDate(p.createdAt)}</p>
          </div>
        </section>
      </div>

      <p className="mt-12 text-xs text-navy-900/50">
        Network connection charges and other third-party costs may apply and are payable to those organisations. We only show dates that have been confirmed by the network or supplier.
      </p>
    </>
  );
}
