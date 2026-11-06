"use server";
import { hashPassword } from "@/lib/auth/password";
import { getCurrentUser, startSession } from "@/lib/auth/session";
import { mutate, newId } from "@/lib/db/store";
import type { Connection, Plot, Project } from "@/lib/db/types";
import { initialMilestones, PROJECT_TYPE_LABEL, UTILITY_LABEL } from "@/lib/domain";
import {
  type ApplicationData,
  indicativeNetworks,
  isMulti,
  plotNames,
  validateAll,
} from "@/lib/application";
import { integrations } from "@/lib/integrations/adapters";
import { normalisePostcode } from "@/lib/integrations/validation";
import { addActivity, notifyProject } from "@/lib/repo/events";

export type SubmitResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string; errors?: Record<string, string> };

export async function submitApplication(data: ApplicationData): Promise<SubmitResult> {
  const current = await getCurrentUser();
  if (current?.role === "admin") {
    return { ok: false, error: "Staff accounts can't submit customer applications. Please sign out first." };
  }
  const errors = validateAll(data, { signedIn: !!current });
  if (Object.keys(errors).length) {
    return { ok: false, error: "A few answers need another look.", errors };
  }

  const now = new Date().toISOString();
  const result = await mutate(async (db) => {
    // 1. Make sure we have a customer account and organisation.
    let userId = current?.id;
    let orgId = current?.organisationId;
    if (!userId) {
      const email = data.contact.email.trim().toLowerCase();
      if (db.users.some((u) => u.email === email)) {
        return { ok: false as const, error: "There's already an account with that email. Please sign in and your answers will be kept." };
      }
      const org = {
        id: newId("org"),
        name: data.contact.company.trim() || data.contact.name.trim(),
        kind: data.contact.company.trim() || isMulti(data) ? ("developer" as const) : ("individual" as const),
        createdAt: now,
      };
      db.organisations.push(org);
      const user = {
        id: newId("usr"),
        email,
        name: data.contact.name.trim(),
        phone: data.contact.phone.trim() || undefined,
        passwordHash: hashPassword(data.contact.password),
        role: "customer" as const,
        organisationId: org.id,
        createdAt: now,
      };
      db.users.push(user);
      userId = user.id;
      orgId = org.id;
    } else if (!orgId) {
      const org = { id: newId("org"), name: current!.name, kind: "individual" as const, createdAt: now };
      db.organisations.push(org);
      orgId = org.id;
      const u = db.users.find((x) => x.id === userId);
      if (u) u.organisationId = org.id;
    } else if (data.contact.phone.trim()) {
      const u = db.users.find((x) => x.id === userId);
      if (u && !u.phone) u.phone = data.contact.phone.trim();
    }

    // 2. Create the project, plots and one connection per utility per plot.
    db.seq += 1;
    const p = data.property;
    const networks = indicativeNetworks(p.postcode);
    const project: Project = {
      id: newId("prj"),
      reference: `GSC-${db.seq}`,
      organisationId: orgId!,
      createdById: userId!,
      name: p.name.trim(),
      projectType: data.projectType!,
      addressLine: p.noAddress ? undefined : p.addressLine.trim(),
      town: p.town.trim() || undefined,
      postcode: normalisePostcode(p.postcode)!,
      siteDescription: p.siteDescription.trim() || undefined,
      siteContact: p.contactIsMe
        ? { name: data.contact.name.trim(), phone: data.contact.phone.trim() || undefined, email: data.contact.email.trim() || current?.email }
        : { name: p.siteContact.name.trim(), phone: p.siteContact.phone.trim() || undefined, email: p.siteContact.email.trim() || undefined },
      utilities: data.utilities,
      interestedIn: data.interestedIn,
      startingPoint: { electricity: data.progress.electricity, gas: data.progress.gas },
      existingReferences: {
        electricity: data.progress.electricityRef.trim() || undefined,
        gas: data.progress.gasRef.trim() || undefined,
      },
      requirements: data.requirements,
      status: "submitted",
      networkOperatorIds: Object.fromEntries(data.utilities.map((u) => [u, networks[u]]).filter(([, v]) => v)),
      consent: { authorised: true, at: now, name: data.contact.name.trim() || current?.name || "" },
      createdAt: now,
      updatedAt: now,
    };
    db.projects.push(project);

    plotNames(data).forEach((pl, i) => {
      const plot: Plot = { id: newId("plt"), projectId: project.id, number: i + 1, name: pl.name, address: pl.address || undefined, createdAt: now };
      db.plots.push(plot);
      for (const u of data.utilities) {
        const c: Connection = {
          id: newId("con"),
          projectId: project.id,
          plotId: plot.id,
          utility: u,
          milestones: initialMilestones(data.progress[u], now),
          networkOperatorId: project.networkOperatorIds[u],
          networkReference: project.existingReferences[u],
          meterPointNumber: (u === "electricity" ? data.progress.mpan : data.progress.mprn).replace(/\s+/g, "") || undefined,
          updatedAt: now,
        };
        db.connections.push(c);
      }
    });

    // 3. Internal tasks via the (manual) network adapter, plus a review task.
    db.tasks.push({
      id: newId("tsk"),
      projectId: project.id,
      audience: "internal",
      title: `Review new request ${project.reference} and confirm network operators`,
      status: "open",
      createdById: userId!,
      createdAt: now,
      dueDate: new Date(Date.now() + 86_400_000).toISOString(),
    });
    for (const u of data.utilities) {
      const op = db.networkOperators.find((o) => o.id === project.networkOperatorIds[u]);
      const r = await integrations.network.submit({ projectReference: project.reference, utility: u, operatorName: op?.name });
      db.tasks.push({
        id: newId("tsk"),
        projectId: project.id,
        audience: "internal",
        title: `${UTILITY_LABEL[u]}: ${data.progress[u] === "scratch" || data.progress[u] === "not_sure" ? "submit network application" : "verify existing network progress"}`,
        detail: r.note,
        status: "open",
        createdById: userId!,
        createdAt: now,
      });
    }

    addActivity(db, {
      projectId: project.id,
      visibility: "customer",
      message: "Your application has been received. Welcome aboard!",
    });
    addActivity(db, {
      projectId: project.id,
      visibility: "internal",
      message: `New ${PROJECT_TYPE_LABEL[project.projectType].toLowerCase()} request submitted (${data.utilities.join(" + ")}).`,
      actorId: userId,
    });
    notifyProject(db, project.id, {
      type: "application_received",
      title: "Application received",
      body: `We've got your request for ${project.name}. Now let us take care of the complicated bits.`,
    });
    db.drafts = db.drafts.filter((d) => d.userId !== userId);
    return { ok: true as const, projectId: project.id, userId: userId! };
  });

  if (!result.ok) return result;
  if (!current) await startSession(result.userId);
  return { ok: true, projectId: result.projectId };
}

/** Save an in-progress application for a signed-in customer. */
export async function saveDraft(data: unknown): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "customer") return { ok: false };
  // Never store the password field.
  const clean = JSON.parse(JSON.stringify(data ?? {}));
  if (clean?.data?.contact) clean.data.contact.password = "";
  await mutate((db) => {
    db.drafts = db.drafts.filter((d) => d.userId !== user.id);
    db.drafts.push({ userId: user.id, data: clean, updatedAt: new Date().toISOString() });
  });
  return { ok: true };
}

export async function loadDraft(): Promise<unknown | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const { readDb } = await import("@/lib/db/store");
  const db = await readDb();
  return db.drafts.find((d) => d.userId === user.id)?.data ?? null;
}
