"use server";
import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth/session";
import { mutate, newId } from "@/lib/db/store";
import { getStorage } from "@/lib/db/storage";
import { initialMilestones } from "@/lib/domain";
import { addActivity, touch } from "@/lib/repo/events";
import { canView } from "@/lib/repo/views";

export async function markAllNotificationsRead() {
  const user = await requireCustomer();
  await mutate((db) => {
    db.notifications.forEach((n) => {
      if (n.userId === user.id) n.read = true;
    });
  });
  revalidatePath("/portal", "layout");
}

export async function markNotificationRead(id: string) {
  const user = await requireCustomer();
  await mutate((db) => {
    const n = db.notifications.find((x) => x.id === id && x.userId === user.id);
    if (n) n.read = true;
  });
  revalidatePath("/portal", "layout");
}

export async function addPlots(
  projectId: string,
  plots: { name: string; address?: string }[],
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCustomer();
  const clean = plots
    .map((p) => ({ name: p.name.trim().slice(0, 120), address: p.address?.trim().slice(0, 200) }))
    .filter((p) => p.name);
  if (!clean.length) return { ok: false, error: "Give each new plot a name." };
  const res = await mutate((db) => {
    const project = db.projects.find((p) => p.id === projectId);
    if (!project || !canView(user, project)) return { ok: false, error: "Project not found." };
    const existing = db.plots.filter((p) => p.projectId === projectId);
    if (existing.length + clean.length > 50) return { ok: false, error: "A development can have up to 50 plots in this demo." };
    const now = new Date().toISOString();
    let n = Math.max(0, ...existing.map((p) => p.number));
    for (const p of clean) {
      const plot = { id: newId("plt"), projectId, number: ++n, name: p.name, address: p.address || undefined, createdAt: now };
      db.plots.push(plot);
      for (const u of project.utilities) {
        db.connections.push({
          id: newId("con"),
          projectId,
          plotId: plot.id,
          utility: u,
          milestones: initialMilestones("scratch", now),
          networkOperatorId: project.networkOperatorIds[u],
          updatedAt: now,
        });
      }
    }
    addActivity(db, {
      projectId,
      visibility: "customer",
      actorId: user.id,
      message: `${clean.length} new plot${clean.length === 1 ? "" : "s"} added. We'll include ${clean.length === 1 ? "it" : "them"} in your network applications.`,
    });
    db.tasks.push({
      id: newId("tsk"),
      projectId,
      audience: "internal",
      title: `Customer added ${clean.length} plot(s) — update network applications`,
      status: "open",
      createdById: user.id,
      createdAt: now,
    });
    touch(db, projectId);
    return { ok: true };
  });
  revalidatePath(`/portal/projects/${projectId}`);
  return res;
}

export async function deleteDocument(documentId: string): Promise<{ ok: boolean }> {
  const user = await requireCustomer();
  const res = await mutate((db) => {
    const doc = db.documents.find((d) => d.id === documentId);
    if (!doc) return null;
    const project = db.projects.find((p) => p.id === doc.projectId);
    if (!project || !canView(user, project)) return null;
    db.documents = db.documents.filter((d) => d.id !== documentId);
    addActivity(db, { projectId: project.id, visibility: "internal", actorId: user.id, message: `Customer removed document “${doc.filename}”.` });
    return doc;
  });
  if (!res) return { ok: false };
  await getStorage().delete(res.storageKey);
  revalidatePath(`/portal/projects/${res.projectId}`);
  return { ok: true };
}
