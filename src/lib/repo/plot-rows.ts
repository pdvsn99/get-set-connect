import "server-only";
import type { PlotRowView } from "@/components/plot-table";
import type { Connection } from "../db/types";
import { currentMilestone, currentStage, formatDate, isComplete, milestoneTitle } from "../domain";
import type { ProjectDetail } from "./views";

function status(c?: Connection) {
  if (!c) return undefined;
  const done = isComplete(c);
  const m = currentMilestone(c);
  return { label: done ? "All done" : milestoneTitle(m.key), stage: currentStage(c), done, who: done ? "completed" : m.responsible };
}

export function plotRows(d: ProjectDetail): PlotRowView[] {
  const supplierName = (id?: string) => d.suppliers.find((s) => s.id === id)?.name;
  return d.rows.map((r) => {
    const e = r.connections.electricity;
    const g = r.connections.gas;
    const conns = [e, g].filter(Boolean) as Connection[];
    const appt = r.appointments.filter((a) => a.status === "booked").sort((a, b) => a.date.localeCompare(b.date))[0];
    const minStage = Math.min(...conns.map(currentStage));
    let bucket: PlotRowView["bucket"];
    if (conns.length && conns.every(isComplete)) bucket = "connected";
    else if (r.openTasks.length || conns.some((c) => !isComplete(c) && currentMilestone(c).responsible === "customer")) bucket = "action";
    else if (minStage <= 2) bucket = "early";
    else if (minStage <= 4) bucket = "network";
    else bucket = "meters";
    return {
      id: r.plot.id,
      name: r.plot.name,
      address: r.plot.address,
      electricity: status(e),
      gas: status(g),
      mpan: e?.meterPointNumber,
      mprn: g?.meterPointNumber,
      supplier: supplierName(e?.supplierId ?? g?.supplierId),
      appointment: appt ? `${formatDate(appt.date, { weekday: "short" })} ${appt.slot === "am" ? "AM" : appt.slot === "pm" ? "PM" : ""}` : undefined,
      actions: r.openTasks.map((t) => t.title),
      bucket,
    };
  });
}
