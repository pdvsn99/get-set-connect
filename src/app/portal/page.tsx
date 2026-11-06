import Link from "next/link";
import { ArrowRight, Bell, CalendarCheck, CircleAlert, MapPin, Plus } from "lucide-react";
import { Sparky } from "@/components/brand";
import { Card, EmptyState, LinkButton, Pill, ProgressBar, StageDots, UtilityChip } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { readDb } from "@/lib/db/store";
import { formatDate, timeAgo, UTILITY_LABEL } from "@/lib/domain";
import { summarise } from "@/lib/repo/views";

export const metadata = { title: "My Connections" };

export default async function PortalHome() {
  const user = await requireCustomer();
  const db = await readDb();
  const projects = db.projects
    .filter((p) => p.organisationId === user.organisationId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((p) => summarise(db, p));
  const actions = projects.reduce((n, s) => n + s.openCustomerTasks.length, 0);
  const first = user.name.split(" ")[0];

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-coral-600">My Connections</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Hi {first} 👋</h1>
          <p className="mt-2 text-lg text-navy-900/70">
            {projects.length === 0
              ? "Let's get your first property connected."
              : actions > 0
                ? `You have ${actions} thing${actions === 1 ? "" : "s"} to do. Everything else, we're on it.`
                : "Nothing for you to do right now. We'll let you know if that changes."}
          </p>
        </div>
        <LinkButton href="/apply" className="self-start sm:self-auto"><Plus className="h-4 w-4" aria-hidden="true" /> New request</LinkButton>
      </div>

      {projects.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<Sparky className="h-28 w-28" mood="wave" />}
            title="No connections yet"
            body="Tell us about your property and we'll take it from there. It takes about five minutes."
            action={<LinkButton href="/apply">Get started — it&apos;s free</LinkButton>}
          />
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 lg:grid-cols-2">
          {projects.map((s, i) => {
            const p = s.project;
            const done = s.progress === 100 || p.status === "completed";
            return (
              <li key={p.id} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                <Link href={`/portal/projects/${p.id}`} className="group block h-full rounded-3xl focus-visible:outline-3">
                  <Card className="flex h-full flex-col p-6 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-lift">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-xl font-extrabold">
                          {p.name}
                          {s.plotCount > 1 && <span className="font-semibold text-navy-900/60"> — {s.plotCount} {p.projectType === "conversion" ? "units" : "new homes"}</span>}
                        </h2>
                        <p className="mt-1 flex items-center gap-1 text-sm text-navy-900/60">
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{[p.addressLine ?? p.siteDescription, p.town, p.postcode].filter(Boolean).join(", ")}</span>
                        </p>
                      </div>
                      <Pill tone={done ? "green" : "lime"} className="shrink-0">{done ? "Complete" : `Stage ${s.stage} of 6`}</Pill>
                    </div>

                    <p className="mt-4 text-[17px] font-bold">{s.headline}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <StageDots stage={s.stage} complete={done} />
                      <span className="text-xs font-semibold text-navy-900/60">{s.progress}% done</span>
                    </div>
                    <ProgressBar value={s.progress} label={`${p.name} progress`} className="sr-only" />

                    <div className="mt-4 flex flex-wrap gap-2">
                      {p.utilities.map((u) => {
                        const st = s.utilityStatus[u]!;
                        return (
                          <span key={u} className="inline-flex items-center gap-2">
                            <UtilityChip utility={u} />
                            <span className="text-xs font-semibold text-navy-900/60">
                              {st.total > 1 ? `${st.complete}/${st.total} connected` : st.complete ? "Connected" : `Stage ${st.stage}`}
                            </span>
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-5 space-y-2.5">
                      {s.openCustomerTasks.slice(0, 2).map((t) => (
                        <div key={t.id} className="flex gap-3 rounded-2xl bg-coral-50 p-3 ring-1 ring-coral-200">
                          <CircleAlert className="h-5 w-5 shrink-0 text-coral-600" aria-hidden="true" />
                          <p className="text-sm"><strong className="text-coral-800">Action required:</strong> {t.title}</p>
                        </div>
                      ))}
                      {s.nextMilestone ? (
                        <div className="flex gap-3 rounded-2xl bg-lime-100 p-3">
                          <CalendarCheck className="h-5 w-5 shrink-0 text-lime-700" aria-hidden="true" />
                          <p className="text-sm">
                            <strong>Next confirmed:</strong> {s.nextMilestone.label}
                            {s.nextMilestone.utility && ` (${UTILITY_LABEL[s.nextMilestone.utility].toLowerCase()})`}
                            {s.plotCount > 1 && s.nextMilestone.plotName && ` · ${s.nextMilestone.plotName}`} — {formatDate(s.nextMilestone.date, { weekday: "short" })}
                          </p>
                        </div>
                      ) : !done ? (
                        <p className="rounded-2xl bg-cream-100 p-3 text-sm text-navy-900/70">Next date: awaiting confirmation. We&apos;ll tell you as soon as it&apos;s confirmed.</p>
                      ) : null}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-sm">
                      {s.latestUpdate ? (
                        <p className="flex min-w-0 items-center gap-2 text-navy-900/60">
                          <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">{s.latestUpdate.message}</span>
                          <span className="shrink-0">· {timeAgo(s.latestUpdate.createdAt)}</span>
                        </p>
                      ) : <span />}
                      <span className="inline-flex shrink-0 items-center gap-1 font-bold group-hover:gap-2 transition-all">View <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
