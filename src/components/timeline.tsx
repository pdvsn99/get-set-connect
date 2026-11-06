import { CalendarCheck, Check, Clock } from "lucide-react";
import type { Appointment, Connection, NetworkOperator, Supplier } from "@/lib/db/types";
import {
  connectionHeadline,
  currentStage,
  formatDate,
  formatDateTime,
  formatPounds,
  isComplete,
  METER_NUMBER,
  MILESTONES,
  NETWORK_EXPLAINER,
  timeAgo,
  UTILITY_LABEL,
} from "@/lib/domain";
import { ResponsibilityBadge, UtilityIcon } from "./ui";

export function ConnectionTimeline({
  connection: c,
  operators,
  suppliers,
  appointments,
}: {
  connection: Connection;
  operators: NetworkOperator[];
  suppliers: Supplier[];
  appointments: Appointment[];
}) {
  const stage = currentStage(c);
  const complete = isComplete(c);
  const op = operators.find((o) => o.id === c.networkOperatorId);
  const supplier = suppliers.find((s) => s.id === c.supplierId);
  const meter = METER_NUMBER[c.utility];
  const appt = appointments.filter((a) => a.connectionId === c.id && a.status === "booked").sort((a, b) => a.date.localeCompare(b.date))[0];
  const elec = c.utility === "electricity";
  return (
    <section className="card overflow-hidden" aria-labelledby={`tl-${c.id}`}>
      <header className={`flex items-center justify-between gap-3 px-5 py-4 ${elec ? "bg-lime-300" : "bg-coral-200"}`}>
        <h3 id={`tl-${c.id}`} className="flex items-center gap-2 text-lg font-extrabold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/70"><UtilityIcon utility={c.utility} className="h-5 w-5" /></span>
          {UTILITY_LABEL[c.utility]}
        </h3>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-extrabold">{complete ? "Connected" : `Stage ${stage} of 6`}</span>
      </header>
      <div className="px-5 pt-4">
        <p className="font-bold">{connectionHeadline(c)}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-navy-900/55">Network</dt>
            <dd className="font-semibold">{op?.name ?? "Being confirmed"}</dd>
          </div>
          <div>
            <dt className="text-navy-900/55">Network reference</dt>
            <dd className="font-semibold break-all">{c.networkReference ?? "Not issued yet"}</dd>
          </div>
          <div>
            <dt className="text-navy-900/55"><abbr title={meter.long}>{meter.short}</abbr></dt>
            <dd className="font-semibold">{c.meterPointNumber ?? "Not allocated yet"}</dd>
          </div>
          <div>
            <dt className="text-navy-900/55">Supplier</dt>
            <dd className="font-semibold">{supplier?.name ?? "Not chosen yet"}</dd>
          </div>
          {c.quotation && (
            <div className="col-span-2">
              <dt className="text-navy-900/55">Network quotation</dt>
              <dd className="font-semibold">
                {c.quotation.status === "awaiting" ? "Waiting for the network to quote" : `${formatPounds(c.quotation.amountPence)} · ${c.quotation.status}`}
              </dd>
            </div>
          )}
        </dl>
        {appt && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-lime-100 px-3 py-2 text-sm font-bold">
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            {appt.kind === "meter_installation" ? "Meter installation" : "Network works"} booked: {formatDate(appt.date, { weekday: "long" })} ({appt.slot === "am" ? "morning" : appt.slot === "pm" ? "afternoon" : "all day"})
          </p>
        )}
      </div>

      <ol className="mt-4 px-3 pb-4">
        {MILESTONES.map((def, i) => {
          const m = c.milestones.find((x) => x.key === def.key)!;
          const done = m.state === "complete";
          const now = m.state === "in_progress" || (!done && i + 1 === stage);
          const last = i === MILESTONES.length - 1;
          return (
            <li key={def.key} className="relative">
              {!last && <span className={`absolute top-10 bottom-0 left-[1.6rem] w-0.5 ${done ? "bg-lime-500" : "bg-navy-900/10"}`} aria-hidden="true" />}
              <details className="group rounded-2xl px-2 py-1.5 open:bg-cream-100" open={now}>
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl py-1.5">
                  <span
                    className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold ${done ? "bg-lime-400 text-navy-900" : now ? "bg-navy-900 text-white animate-pulse-ring" : "bg-white text-navy-900/40 ring-2 ring-navy-900/10"}`}
                  >
                    {done ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-bold ${!done && !now ? "text-navy-900/50" : ""}`}>{def.title}</span>
                    <span className="sr-only">{done ? "Completed" : now ? "In progress" : "Not started"}</span>
                  </span>
                  {(done || now) && <ResponsibilityBadge who={done ? "completed" : m.responsible} className="hidden sm:inline-flex" />}
                  <span className="text-navy-900/40 transition group-open:rotate-90" aria-hidden="true">›</span>
                </summary>
                <div className="pb-2 pl-11 text-sm text-navy-900/75">
                  {(done || now) && <ResponsibilityBadge who={done ? "completed" : m.responsible} className="mb-2 sm:hidden" />}
                  <p>{def.explainer}</p>
                  {i === 1 && <p className="mt-1 text-navy-900/60">{NETWORK_EXPLAINER[c.utility]}</p>}
                  {m.note && !done && <p className="mt-2 rounded-xl bg-white p-2.5 font-semibold text-navy-900">{m.note}</p>}
                  {!done && now && (
                    <p className="mt-2 flex items-center gap-1.5 font-semibold">
                      {m.confirmedDate ? (
                        <><CalendarCheck className="h-4 w-4 text-lime-700" aria-hidden="true" /> Confirmed for {formatDate(m.confirmedDate, { weekday: "long" })}</>
                      ) : (
                        <><Clock className="h-4 w-4" aria-hidden="true" /> Awaiting confirmation of a date — we won&apos;t guess.</>
                      )}
                    </p>
                  )}
                  {(done || now) && (
                    <p className="mt-1 text-xs text-navy-900/50">
                      Updated <time dateTime={m.updatedAt} title={formatDateTime(m.updatedAt)}>{timeAgo(m.updatedAt)}</time>
                    </p>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
