import "server-only";
import { newId } from "../db/store";
import { integrations } from "../integrations/adapters";
import type { Database, NotificationType, Utility } from "../db/types";

const now = () => new Date().toISOString();

export function addActivity(
  db: Database,
  e: {
    projectId: string;
    message: string;
    visibility: "customer" | "internal";
    actorId?: string;
    utility?: Utility;
    plotId?: string;
  },
) {
  db.activity.push({ id: newId("act"), createdAt: now(), ...e });
}

export function addHistory(
  db: Database,
  e: { projectId: string; actorId: string; summary: string; before?: string; after?: string },
) {
  db.history.push({ id: newId("his"), createdAt: now(), ...e });
}

/** Notify every customer user in the project's organisation (in-app; email is mocked). */
export function notifyProject(
  db: Database,
  projectId: string,
  n: { type: NotificationType; title: string; body: string },
) {
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) return;
  const recipients = db.users.filter(
    (u) => u.role === "customer" && u.organisationId === project.organisationId,
  );
  for (const u of recipients) {
    db.notifications.push({
      id: newId("ntf"),
      userId: u.id,
      projectId,
      read: false,
      createdAt: now(),
      ...n,
    });
    void integrations.email.send({ to: u.email, subject: n.title, body: n.body });
  }
}

export function touch(db: Database, projectId: string) {
  const p = db.projects.find((x) => x.id === projectId);
  if (p) p.updatedAt = now();
}
