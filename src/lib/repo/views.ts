import "server-only";
import { notFound } from "next/navigation";
import {
  connectionHeadline,
  currentMilestone,
  isComplete,
  overallStage,
  progressPercent,
} from "../domain";
import type { SessionUser } from "../auth/session";
import type {
  Appointment,
  Connection,
  Database,
  Plot,
  Project,
  Task,
  Utility,
} from "../db/types";

export type Audience = "customer" | "admin";

export interface NextMilestone {
  label: string;
  date: string;
  utility?: Utility;
  plotName?: string;
}

export interface ProjectSummary {
  project: Project;
  plotCount: number;
  stage: number;
  progress: number;
  headline: string;
  openCustomerTasks: Task[];
  latestUpdate?: { message: string; createdAt: string };
  nextMilestone?: NextMilestone;
  utilityStatus: Partial<Record<Utility, { stage: number; complete: number; total: number }>>;
}

/** Customers can only ever see their own organisation's projects. */
export function canView(user: SessionUser, project: Project) {
  if (user.role === "admin") return true;
  return !!user.organisationId && project.organisationId === user.organisationId;
}

export function nextConfirmed(
  db: Database,
  project: Project,
  conns: Connection[],
): NextMilestone | undefined {
  const now = Date.now();
  const plots = new Map(db.plots.map((p) => [p.id, p]));
  const candidates: NextMilestone[] = [];
  for (const c of conns) {
    for (const m of c.milestones) {
      if (m.state !== "complete" && m.confirmedDate && new Date(m.confirmedDate).getTime() >= now - 86_400_000) {
        candidates.push({
          label: m.key === "meter_arranged" ? "Meter installation" : m.key === "works_arranged" ? "Network works" : "Confirmed date",
          date: m.confirmedDate,
          utility: c.utility,
          plotName: plots.get(c.plotId)?.name,
        });
      }
    }
  }
  for (const a of db.appointments) {
    if (a.projectId !== project.id || a.status !== "booked") continue;
    if (new Date(a.date).getTime() < now - 86_400_000) continue;
    const c = conns.find((x) => x.id === a.connectionId);
    candidates.push({
      label: a.kind === "meter_installation" ? "Meter installation" : "Network works",
      date: a.date,
      utility: c?.utility,
      plotName: c ? plots.get(c.plotId)?.name : undefined,
    });
  }
  candidates.sort((a, b) => a.date.localeCompare(b.date));
  return candidates[0];
}

export function summarise(db: Database, project: Project): ProjectSummary {
  const conns = db.connections.filter((c) => c.projectId === project.id);
  const plotCount = db.plots.filter((p) => p.projectId === project.id).length;
  const openCustomerTasks = db.tasks.filter(
    (t) => t.projectId === project.id && t.audience === "customer" && t.status === "open",
  );
  const latest = db.activity
    .filter((a) => a.projectId === project.id && a.visibility === "customer")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  // Headline: prioritise anything waiting on the customer, then the slowest connection.
  let headline: string;
  if (project.status === "withdrawn") headline = "This request has been withdrawn.";
  else if (conns.length && conns.every(isComplete)) headline = "All connected. Happy days!";
  else if (openCustomerTasks.length) headline = "Over to you — we need one more thing.";
  else {
    const slowest = [...conns].sort(
      (a, b) =>
        a.milestones.filter((m) => m.state === "complete").length -
        b.milestones.filter((m) => m.state === "complete").length,
    )[0];
    headline = slowest ? connectionHeadline(slowest) : "We're reviewing your request.";
  }

  const utilityStatus: ProjectSummary["utilityStatus"] = {};
  for (const u of project.utilities) {
    const uc = conns.filter((c) => c.utility === u);
    utilityStatus[u] = {
      stage: overallStage(uc),
      complete: uc.filter(isComplete).length,
      total: uc.length,
    };
  }

  return {
    project,
    plotCount,
    stage: overallStage(conns),
    progress: progressPercent(conns),
    headline,
    openCustomerTasks,
    latestUpdate: latest && { message: latest.message, createdAt: latest.createdAt },
    nextMilestone: nextConfirmed(db, project, conns),
    utilityStatus,
  };
}

export interface PlotRow {
  plot: Plot;
  connections: Partial<Record<Utility, Connection>>;
  appointments: Appointment[];
  openTasks: Task[];
}

export function projectDetail(db: Database, user: SessionUser, projectId: string) {
  const project = db.projects.find((p) => p.id === projectId);
  if (!project || !canView(user, project)) notFound();
  const isAdmin = user.role === "admin";
  const plots = db.plots
    .filter((p) => p.projectId === project.id)
    .sort((a, b) => a.number - b.number);
  const connections = db.connections.filter((c) => c.projectId === project.id);
  const appointments = db.appointments.filter((a) => a.projectId === project.id);
  const tasks = db.tasks
    .filter((t) => t.projectId === project.id && (isAdmin || t.audience === "customer"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rows: PlotRow[] = plots.map((plot) => {
    const pc = connections.filter((c) => c.plotId === plot.id);
    return {
      plot,
      connections: Object.fromEntries(pc.map((c) => [c.utility, c])) as PlotRow["connections"],
      appointments: appointments.filter((a) => pc.some((c) => c.id === a.connectionId)),
      openTasks: tasks.filter(
        (t) => t.status === "open" && t.audience === "customer" && (!t.plotIds || t.plotIds.includes(plot.id)),
      ),
    };
  });
  return {
    project,
    summary: summarise(db, project),
    plots,
    rows,
    connections,
    appointments,
    tasks,
    documents: db.documents
      .filter((d) => d.projectId === project.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    activity: db.activity
      .filter((a) => a.projectId === project.id && (isAdmin || a.visibility === "customer"))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    notes: db.notes
      .filter((n) => n.projectId === project.id && (isAdmin || n.visibility === "customer"))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    history: isAdmin
      ? db.history.filter((h) => h.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [],
    operators: db.networkOperators,
    suppliers: db.suppliers,
    staff: db.users.filter((u) => u.role === "admin").map((u) => ({ id: u.id, name: u.name })),
    users: Object.fromEntries(db.users.map((u) => [u.id, u.name])) as Record<string, string>,
    customer: (() => {
      const u = db.users.find((x) => x.id === project.createdById);
      return u ? { name: u.name, email: u.email, phone: u.phone } : undefined;
    })(),
    organisation: db.organisations.find((o) => o.id === project.organisationId),
  };
}

export type ProjectDetail = ReturnType<typeof projectDetail>;

export function currentNote(c?: Connection) {
  return c ? currentMilestone(c).note : undefined;
}
