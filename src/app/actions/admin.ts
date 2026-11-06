"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { mutate, newId, resetDemoData } from "@/lib/db/store";
import type {
  Connection,
  Database,
  DocumentCategory,
  MilestoneKey,
  MilestoneState,
  ProjectStatus,
  Quotation,
  Responsibility,
  Utility,
} from "@/lib/db/types";
import {
  DOCUMENT_CATEGORY,
  formatDate,
  formatPounds,
  isComplete,
  milestoneTitle,
  MILESTONES,
  PROJECT_STATUS_LABEL,
  RESPONSIBILITY,
  UTILITY_LABEL,
} from "@/lib/domain";
import { integrations } from "@/lib/integrations/adapters";
import { validateMpan, validateMprn } from "@/lib/integrations/validation";
import { addActivity, addHistory, notifyProject, touch } from "@/lib/repo/events";

export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const opt = (f: FormData, k: string) => str(f, k) || undefined;
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
const isoDate = (v?: string) => (v ? new Date(`${v}T09:00:00Z`).toISOString() : undefined);

// Pages are rendered dynamically, so only the page being edited needs
// refreshing; customer and list pages always read fresh data.
function done(projectId: string, message: string): ActionState {
  revalidatePath(`/admin/cases/${projectId}`);
  return { ok: true, message };
}

/** The connection plus (optionally) its siblings on other plots with the same utility. */
function targets(db: Database, connectionId: string, all: boolean): Connection[] {
  const c = db.connections.find((x) => x.id === connectionId);
  if (!c) return [];
  return all ? db.connections.filter((x) => x.projectId === c.projectId && x.utility === c.utility) : [c];
}

function plotLabel(db: Database, cs: Connection[]) {
  if (cs.length !== 1) return "";
  const plots = db.plots.filter((p) => p.projectId === cs[0].projectId);
  if (plots.length < 2) return "";
  return ` for ${plots.find((p) => p.id === cs[0].plotId)?.name}`;
}

function refreshProjectStatus(db: Database, projectId: string) {
  const p = db.projects.find((x) => x.id === projectId);
  if (!p || p.status === "withdrawn") return;
  const conns = db.connections.filter((c) => c.projectId === projectId);
  const waiting = db.tasks.some((t) => t.projectId === projectId && t.audience === "customer" && t.status === "open");
  if (conns.length && conns.every(isComplete)) p.status = "completed";
  else if (waiting) p.status = "awaiting_customer";
  else if (p.status !== "submitted" || conns.some((c) => c.milestones[0].state === "complete")) p.status = "in_progress";
}

// ── Milestones ─────────────────────────────────────────────────────────────
export async function updateMilestone(_: ActionState, f: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const connectionId = str(f, "connectionId");
  const key = str(f, "key") as MilestoneKey;
  const state = str(f, "state") as MilestoneState;
  const responsible = str(f, "responsible") as Responsibility;
  const confirmedDate = isoDate(opt(f, "confirmedDate"));
  const note = opt(f, "note");
  const applyAll = bool(f, "applyAll");
  const notify = bool(f, "notify");
  if (!MILESTONES.some((m) => m.key === key)) return { error: "Unknown milestone." };
  if (!["not_started", "in_progress", "complete"].includes(state)) return { error: "Choose a state." };
  if (!(responsible in RESPONSIBILITY)) return { error: "Choose who is responsible." };

  let projectId = "";
  const res = await mutate((db) => {
    const cs = targets(db, connectionId, applyAll);
    if (!cs.length) return { error: "Connection not found." };
    projectId = cs[0].projectId;
    const now = new Date().toISOString();
    const before = cs[0].milestones.find((m) => m.key === key);
    const beforeText = before ? `${before.state} / ${RESPONSIBILITY[before.responsible].label}${before.confirmedDate ? ` / ${formatDate(before.confirmedDate)}` : ""}` : "";
    for (const c of cs) {
      const idx = c.milestones.findIndex((m) => m.key === key);
      const m = c.milestones[idx];
      m.state = state;
      m.responsible = state === "complete" ? "completed" : responsible;
      m.confirmedDate = confirmedDate;
      m.note = note;
      m.updatedAt = now;
      if (state === "complete") {
        // Everything before a completed milestone is complete too.
        c.milestones.slice(0, idx).forEach((p) => {
          if (p.state !== "complete") Object.assign(p, { state: "complete", responsible: "completed", updatedAt: now });
        });
        const next = c.milestones[idx + 1];
        if (next && next.state === "not_started") Object.assign(next, { state: "in_progress", responsible: "us", updatedAt: now });
      }
      c.updatedAt = now;
    }
    const u = UTILITY_LABEL[cs[0].utility];
    const title = milestoneTitle(key);
    const where = applyAll && cs.length > 1 ? " for all plots" : plotLabel(db, cs);
    addHistory(db, {
      projectId,
      actorId: admin.id,
      summary: `${u} — ${title}${where}`,
      before: beforeText,
      after: `${state} / ${RESPONSIBILITY[state === "complete" ? "completed" : responsible].label}${confirmedDate ? ` / ${formatDate(confirmedDate)}` : ""}`,
    });
    if (notify) {
      const allDone = cs.every(isComplete);
      let message: string;
      let type: Parameters<typeof notifyProject>[2]["type"] = "update";
      if (key === "connected" && state === "complete") {
        message = `Your ${u.toLowerCase()} is connected${where}. Happy days!`;
        type = "connection_completed";
      } else if (confirmedDate && state !== "complete") {
        message = `Your ${u.toLowerCase()} ${key === "meter_arranged" ? "meter installation" : "connection"} date has been confirmed${where}: ${formatDate(confirmedDate)}.`;
        type = key === "meter_arranged" ? "installation_booked" : "date_confirmed";
      } else if (state === "complete") {
        message = `${u}: “${title}” is complete${where}. You're one step closer!`;
      } else {
        message = note ? `${u}${where}: ${note}` : `${u}: “${title}” is ${state === "in_progress" ? "underway" : "updated"}${where}.`;
      }
      addActivity(db, { projectId, visibility: "customer", actorId: admin.id, utility: cs[0].utility, plotId: cs.length === 1 ? cs[0].plotId : undefined, message });
      notifyProject(db, projectId, { type, title: allDone ? "All connected. Happy days!" : `${u} update`, body: message });
    }
    refreshProjectStatus(db, projectId);
    touch(db, projectId);
    return { ok: true };
  });
  if ("error" in res) return { error: res.error };
  return done(projectId, notify ? "Milestone updated and customer notified." : "Milestone updated (customer not notified).");
}

// ── Connection details: operator, reference, MPAN/MPRN ────────────────────
export async function updateConnectionDetails(_: ActionState, f: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const connectionId = str(f, "connectionId");
  const networkOperatorId = opt(f, "networkOperatorId");
  const networkReference = opt(f, "networkReference");
  const meterPointNumber = opt(f, "meterPointNumber")?.replace(/\s+/g, "");
  const applyAll = bool(f, "applyAll");
  let projectId = "";
  const res = await mutate((db) => {
    const cs = targets(db, connectionId, applyAll);
    if (!cs.length) return { error: "Connection not found." };
    projectId = cs[0].projectId;
    const u = cs[0].utility;
    if (meterPointNumber) {
      const check = u === "electricity" ? validateMpan(meterPointNumber) : validateMprn(meterPointNumber);
      if (!check.ok) return { error: check.message };
    }
    const changes: string[] = [];
    for (const c of cs) {
      if (networkOperatorId !== undefined && c.networkOperatorId !== networkOperatorId) c.networkOperatorId = networkOperatorId;
      if (networkReference !== c.networkReference) c.networkReference = networkReference;
      c.updatedAt = new Date().toISOString();
    }
    // Meter numbers are unique to a plot, so they never apply to all.
    const own = db.connections.find((c) => c.id === connectionId)!;
    if (meterPointNumber !== own.meterPointNumber) {
      changes.push(`${u === "electricity" ? "MPAN" : "MPRN"}: ${own.meterPointNumber ?? "—"} → ${meterPointNumber ?? "—"}`);
      own.meterPointNumber = meterPointNumber;
    }
    const project = db.projects.find((p) => p.id === projectId)!;
    if (networkOperatorId) project.networkOperatorIds[u] = networkOperatorId;
    addHistory(db, {
      projectId,
      actorId: admin.id,
      summary: `${UTILITY_LABEL[u]} details updated${applyAll ? " for all plots" : plotLabel(db, [own])}`,
      after: [networkOperatorId && `Operator: ${db.networkOperators.find((o) => o.id === networkOperatorId)?.name}`, networkReference && `Ref: ${networkReference}`, ...changes].filter(Boolean).join("; "),
    });
    if (changes.length) {
      addActivity(db, { projectId, visibility: "customer", actorId: admin.id, utility: u, plotId: own.plotId, message: `Your ${u === "electricity" ? "MPAN (electricity supply number)" : "MPRN (gas supply number)"} has been allocated${plotLabel(db, [own])}.` });
      notifyProject(db, projectId, { type: "update", title: `${u === "electricity" ? "MPAN" : "MPRN"} allocated`, body: `We've recorded your ${u} supply number. You'll need it when setting up your energy account.` });
    }
    touch(db, projectId);
    return { ok: true };
  });
  if ("error" in res) return { error: res.error };
  return done(projectId, "Connection details saved.");
}

// ── Quotations ─────────────────────────────────────────────────────────────
export async function updateQuotation(_: ActionState, f: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const connectionId = str(f, "connectionId");
  const status = str(f, "status") as Quotation["status"];
  const amount = opt(f, "amount");
  const amountPence = amount ? Math.round(Number(amount.replace(/[£,\s]/g, "")) * 100) : undefined;
  if (amount && (!Number.isFinite(amountPence) || amountPence! < 0)) return { error: "Enter the amount in pounds, e.g. 2145.00" };
  const applyAll = bool(f, "applyAll");
  let projectId = "";
  const res = await mutate((db) => {
    const cs = targets(db, connectionId, applyAll);
    if (!cs.length) return { error: "Connection not found." };
    projectId = cs[0].projectId;
    const prev = cs[0].quotation?.status;
    const q: Quotation = {
      status,
      amountPence,
      receivedAt: status === "awaiting" ? undefined : (cs[0].quotation?.receivedAt ?? new Date().toISOString()),
      validUntil: isoDate(opt(f, "validUntil")),
      notes: opt(f, "notes"),
    };
    cs.forEach((c) => (c.quotation = { ...q }));
    const u = UTILITY_LABEL[cs[0].utility];
    addHistory(db, { projectId, actorId: admin.id, summary: `${u} quotation${applyAll ? " (all plots)" : ""}`, before: prev, after: `${status}${amountPence !== undefined ? ` ${formatPounds(amountPence)}` : ""}` });
    if (status === "received" && prev !== "received") {
      const msg = `We've received the ${u.toLowerCase()} network quotation${amountPence !== undefined ? `: ${formatPounds(amountPence)}` : ""}. We'll talk you through it.`;
      addActivity(db, { projectId, visibility: "customer", actorId: admin.id, utility: cs[0].utility, message: msg });
      notifyProject(db, projectId, { type: "quotation_received", title: `${u} quotation received`, body: msg });
    } else if (status === "accepted" || status === "paid") {
      addActivity(db, { projectId, visibility: "customer", actorId: admin.id, utility: cs[0].utility, message: `Your ${u.toLowerCase()} quotation has been ${status}.` });
    }
    touch(db, projectId);
    return { ok: true };
  });
  if ("error" in res) return { error: res.error };
  return done(projectId, "Quotation saved.");
}

// ── Case management ────────────────────────────────────────────────────────
export async function assignOwner(_: ActionState, f: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const projectId = str(f, "projectId");
  const ownerId = opt(f, "ownerId");
  await mutate((db) => {
    const p = db.projects.find((x) => x.id === projectId);
    if (!p) return;
    const name = (id?: string) => db.users.find((u) => u.id === id)?.name ?? "Unassigned";
    addHistory(db, { projectId, actorId: admin.id, summary: "Case owner changed", before: name(p.caseOwnerId), after: name(ownerId) });
    p.caseOwnerId = ownerId;
    if (p.status === "submitted" && ownerId) p.status = "in_progress";
    touch(db, projectId);
  });
  return done(projectId, "Case owner updated.");
}

export async function setProjectStatus(_: ActionState, f: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const projectId = str(f, "projectId");
  const status = str(f, "status") as ProjectStatus;
  const reason = opt(f, "reason");
  if (!(status in PROJECT_STATUS_LABEL)) return { error: "Unknown status." };
  await mutate((db) => {
    const p = db.projects.find((x) => x.id === projectId);
    if (!p) return;
    addHistory(db, { projectId, actorId: admin.id, summary: "Case status changed", before: PROJECT_STATUS_LABEL[p.status], after: `${PROJECT_STATUS_LABEL[status]}${reason ? ` — ${reason}` : ""}` });
    p.status = status;
    if (status === "completed") {
      addActivity(db, { projectId, visibility: "customer", actorId: admin.id, message: "Your project is complete. All connected. Happy days!" });
      notifyProject(db, projectId, { type: "connection_completed", title: "All connected. Happy days!", body: `${p.name} is complete. Thanks for choosing us.` });
    } else if (status === "withdrawn") {
      addActivity(db, { projectId, visibility: "customer", actorId: admin.id, message: `This request has been withdrawn${reason ? `: ${reason}` : "."}` });
      notifyProject(db, projectId, { type: "update", title: "Request withdrawn", body: `${p.name} has been withdrawn. Get in touch if this is unexpected.` });
    }
    touch(db, projectId);
  });
  return done(projectId, `Case marked as ${PROJECT_STATUS_LABEL[status].toLowerCase()}.`);
}

export async function requestInformation(_: ActionState, f: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const projectId = str(f, "projectId");
  const title = str(f, "title");
  const detail = opt(f, "detail");
  const category = opt(f, "documentCategory") as DocumentCategory | undefined;
  const plotIds = f.getAll("plotIds").map(String).filter(Boolean);
  if (title.length < 5) return { error: "Describe what you need from the customer." };
  if (category && !(category in DOCUMENT_CATEGORY)) return { error: "Unknown document type." };
  await mutate((db) => {
    const p = db.projects.find((x) => x.id === projectId);
    if (!p) return;
    db.tasks.push({ id: newId("tsk"), projectId, audience: "customer", title, detail, documentCategory: category, plotIds: plotIds.length ? plotIds : undefined, status: "open", createdById: admin.id, createdAt: new Date().toISOString() });
    p.status = "awaiting_customer";
    addActivity(db, { projectId, visibility: "customer", actorId: admin.id, message: `We need something from you before we can proceed: ${title}` });
    notifyProject(db, projectId, { type: "info_required", title: "Over to you — we need one more thing", body: title });
    addHistory(db, { projectId, actorId: admin.id, summary: "Requested information from customer", after: title });
    touch(db, projectId);
  });
  return done(projectId, "Request sent — the customer will see it in their portal.");
}

export async function addNote(_: ActionState, f: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const projectId = str(f, "projectId");
  const body = str(f, "body");
  const visibility = str(f, "visibility") === "customer" ? "customer" : "internal";
  if (body.length < 2) return { error: "Write a note first." };
  await mutate((db) => {
    db.notes.push({ id: newId("not"), projectId, visibility, body: body.slice(0, 4000), authorId: admin.id, createdAt: new Date().toISOString() });
    if (visibility === "customer") {
      addActivity(db, { projectId, visibility: "customer", actorId: admin.id, message: body.slice(0, 300) });
      notifyProject(db, projectId, { type: "update", title: "New message from the team", body: body.slice(0, 160) });
    }
    touch(db, projectId);
  });
  return done(projectId, visibility === "customer" ? "Message sent to the customer." : "Internal note saved.");
}

// ── Tasks & reminders ──────────────────────────────────────────────────────
export async function addTask(_: ActionState, f: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const projectId = str(f, "projectId");
  const title = str(f, "title");
  if (title.length < 3) return { error: "Give the task a title." };
  await mutate((db) => {
    db.tasks.push({ id: newId("tsk"), projectId, audience: "internal", title, assigneeId: opt(f, "assigneeId") ?? admin.id, dueDate: isoDate(opt(f, "dueDate")), status: "open", createdById: admin.id, createdAt: new Date().toISOString() });
  });
  return done(projectId, "Task added.");
}

export async function toggleTask(f: FormData) {
  const admin = await requireAdmin();
  const taskId = str(f, "taskId");
  let projectId = "";
  await mutate((db) => {
    const t = db.tasks.find((x) => x.id === taskId);
    if (!t) return;
    projectId = t.projectId;
    t.status = t.status === "open" ? "done" : "open";
    t.completedAt = t.status === "done" ? new Date().toISOString() : undefined;
    addHistory(db, { projectId, actorId: admin.id, summary: `${t.audience === "customer" ? "Customer action" : "Task"} ${t.status === "done" ? "completed" : "reopened"}`, after: t.title });
    refreshProjectStatus(db, projectId);
  });
  revalidatePath("/admin/tasks");
  if (projectId) done(projectId, "");
}

// ── Appointments ───────────────────────────────────────────────────────────
export async function bookAppointment(_: ActionState, f: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const projectId = str(f, "projectId");
  const plotId = str(f, "plotId");
  const utilities = f.getAll("utilities").map(String) as Utility[];
  const date = isoDate(opt(f, "date"));
  const slot = (opt(f, "slot") ?? "am") as "am" | "pm" | "all_day";
  const kind = str(f, "kind") === "network_works" ? "network_works" : "meter_installation";
  if (!date) return { error: "Choose the confirmed appointment date." };
  if (!utilities.length) return { error: "Choose electricity, gas or both." };
  await mutate((db) => {
    const conns = db.connections.filter((c) => c.projectId === projectId && c.plotId === plotId && utilities.includes(c.utility));
    const now = new Date().toISOString();
    const milestoneKey: MilestoneKey = kind === "meter_installation" ? "meter_arranged" : "works_arranged";
    for (const c of conns) {
      db.appointments.push({ id: newId("apt"), projectId, connectionId: c.id, kind, date, slot, status: "booked", notes: opt(f, "notes"), createdAt: now });
      const m = c.milestones.find((x) => x.key === milestoneKey)!;
      const idx = c.milestones.indexOf(m);
      c.milestones.slice(0, idx).forEach((p) => p.state !== "complete" && Object.assign(p, { state: "complete", responsible: "completed", updatedAt: now }));
      Object.assign(m, { state: "in_progress", responsible: kind === "meter_installation" ? "supplier" : "network", confirmedDate: date, note: kind === "meter_installation" ? "Your meter installation is booked." : "Your network works date is confirmed.", updatedAt: now });
    }
    const plot = db.plots.find((p) => p.id === plotId);
    const multi = db.plots.filter((p) => p.projectId === projectId).length > 1;
    const what = utilities.map((u) => UTILITY_LABEL[u].toLowerCase()).join(" and ");
    const msg = `Your ${what} ${kind === "meter_installation" ? "meter installation" : "network works"} is booked for ${formatDate(date)} (${slot === "am" ? "morning" : slot === "pm" ? "afternoon" : "all day"})${multi && plot ? ` — ${plot.name}` : ""}.`;
    addActivity(db, { projectId, plotId, visibility: "customer", actorId: admin.id, message: msg });
    notifyProject(db, projectId, { type: kind === "meter_installation" ? "installation_booked" : "date_confirmed", title: kind === "meter_installation" ? "Installation booked" : "Network date confirmed", body: msg });
    addHistory(db, { projectId, actorId: admin.id, summary: "Appointment booked", after: msg });
    refreshProjectStatus(db, projectId);
    touch(db, projectId);
  });
  return done(projectId, "Appointment booked and customer notified.");
}

export async function setAppointmentStatus(f: FormData) {
  const admin = await requireAdmin();
  const id = str(f, "appointmentId");
  const status = str(f, "status") as "completed" | "cancelled";
  let projectId = "";
  await mutate((db) => {
    const a = db.appointments.find((x) => x.id === id);
    if (!a) return;
    projectId = a.projectId;
    a.status = status;
    addHistory(db, { projectId, actorId: admin.id, summary: `Appointment ${status}`, after: formatDate(a.date) });
    if (status === "cancelled") {
      const c = db.connections.find((x) => x.id === a.connectionId);
      const m = c?.milestones.find((x) => x.key === (a.kind === "meter_installation" ? "meter_arranged" : "works_arranged"));
      if (m && m.confirmedDate === a.date) Object.assign(m, { confirmedDate: undefined, responsible: "us", note: "We're rearranging this appointment and will confirm a new date." });
      addActivity(db, { projectId, visibility: "customer", actorId: admin.id, message: `Your appointment on ${formatDate(a.date)} has been cancelled. We're arranging a new date.` });
      notifyProject(db, projectId, { type: "update", title: "Appointment cancelled", body: "We're rearranging your appointment and will confirm a new date." });
    }
  });
  if (projectId) done(projectId, "");
}

// ── Suppliers ──────────────────────────────────────────────────────────────
export async function selectSupplier(_: ActionState, f: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const projectId = str(f, "projectId");
  const supplierId = str(f, "supplierId");
  const reason = opt(f, "reason");
  const res = await mutate(async (db) => {
    const p = db.projects.find((x) => x.id === projectId);
    const s = db.suppliers.find((x) => x.id === supplierId);
    if (!p || !s) return { error: "Supplier not found." };
    if (!s.acceptingReferrals) return { error: `${s.name} isn't accepting referrals at the moment.` };
    p.supplierId = s.id;
    db.connections.filter((c) => c.projectId === projectId && s.fuels.includes(c.utility)).forEach((c) => (c.supplierId = s.id));
    const r = await integrations.supplierReferral.refer({ projectReference: p.reference, supplierName: s.name });
    db.tasks.push({ id: newId("tsk"), projectId, audience: "internal", title: `Arrange account and meter with ${s.name}`, detail: r.note, assigneeId: p.caseOwnerId ?? admin.id, status: "open", createdById: admin.id, createdAt: new Date().toISOString() });
    addActivity(db, { projectId, visibility: "customer", actorId: admin.id, message: `${s.name} has been selected as your energy supplier.` });
    notifyProject(db, projectId, { type: "supplier_selected", title: "Supplier selected", body: `${s.name} will supply ${p.name}.${reason ? ` Why: ${reason}` : ""}` });
    addHistory(db, { projectId, actorId: admin.id, summary: "Supplier selected", after: `${s.name}${reason ? ` — ${reason}` : ""}` });
    touch(db, projectId);
    return { ok: true };
  });
  if ("error" in res) return { error: res.error };
  return done(projectId, "Supplier recorded and customer notified.");
}

export async function saveSupplier(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = opt(f, "id");
  const name = str(f, "name");
  if (name.length < 2) return { error: "Supplier name is required." };
  const fuels = f.getAll("fuels").map(String).filter((x): x is Utility => x === "electricity" || x === "gas");
  if (!fuels.length) return { error: "Choose at least one fuel." };
  const lead = opt(f, "leadTimeDays");
  const record = {
    name,
    fuels,
    capabilities: str(f, "capabilities").split(",").map((s) => s.trim()).filter(Boolean),
    eligibilityNotes: str(f, "eligibilityNotes"),
    leadTimeDays: lead ? Math.max(0, Math.round(Number(lead))) : undefined,
    leadTimeVerified: bool(f, "leadTimeVerified"),
    referralArrangement: opt(f, "referralArrangement"),
    acceptingReferrals: bool(f, "acceptingReferrals"),
    isDemo: bool(f, "isDemo"),
    updatedAt: new Date().toISOString(),
  };
  await mutate((db) => {
    const existing = id && db.suppliers.find((s) => s.id === id);
    if (existing) Object.assign(existing, record);
    else db.suppliers.push({ id: newId("sup"), ...record });
  });
  revalidatePath("/admin/suppliers");
  return { ok: true, message: id ? "Supplier updated." : "Supplier added." };
}

// ── Documents ──────────────────────────────────────────────────────────────
export async function setDocumentStatus(f: FormData) {
  const admin = await requireAdmin();
  const id = str(f, "documentId");
  const status = str(f, "status") as "accepted" | "needs_replacement";
  let projectId = "";
  await mutate((db) => {
    const d = db.documents.find((x) => x.id === id);
    if (!d) return;
    projectId = d.projectId;
    d.status = status;
    addHistory(db, { projectId, actorId: admin.id, summary: `Document ${status === "accepted" ? "accepted" : "needs replacing"}`, after: d.filename });
    if (status === "needs_replacement") {
      const label = DOCUMENT_CATEGORY[d.category].label.toLowerCase();
      db.tasks.push({ id: newId("tsk"), projectId, audience: "customer", title: `Please replace “${d.filename}”`, detail: `We couldn't use this ${label}. A clearer or more complete version will help.`, documentCategory: d.category, plotIds: d.plotId ? [d.plotId] : undefined, status: "open", createdById: admin.id, createdAt: new Date().toISOString() });
      addActivity(db, { projectId, visibility: "customer", actorId: admin.id, message: `We need another ${label} before we can proceed.` });
      notifyProject(db, projectId, { type: "info_required", title: "Over to you — we need another document", body: `Please replace “${d.filename}”.` });
      const p = db.projects.find((x) => x.id === projectId);
      if (p) p.status = "awaiting_customer";
    }
  });
  if (projectId) done(projectId, "");
}

// ── Demo ───────────────────────────────────────────────────────────────────
export async function resetDemo() {
  await requireAdmin();
  await resetDemoData();
  revalidatePath("/", "layout");
  redirect("/admin?reset=1");
}
