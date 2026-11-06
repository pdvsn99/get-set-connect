import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorage } from "@/lib/db/storage";
import { mutate, newId } from "@/lib/db/store";
import type { DocumentCategory, StoredDocument } from "@/lib/db/types";
import { DOCUMENT_CATEGORY } from "@/lib/domain";
import { addActivity, notifyProject, touch } from "@/lib/repo/events";
import { canView } from "@/lib/repo/views";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB request bodies
const ALLOWED = /^(image\/(png|jpe?g|webp|heic|heif|gif)|application\/pdf)$/;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const projectId = String(form?.get("projectId") ?? "");
  const category = String(form?.get("category") ?? "other") as DocumentCategory;
  const plotId = String(form?.get("plotId") ?? "") || undefined;
  const replaceId = String(form?.get("replaceId") ?? "") || undefined;
  const taskId = String(form?.get("taskId") ?? "") || undefined;

  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (!(category in DOCUMENT_CATEGORY)) return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That file is over 4 MB. Please choose a smaller one." }, { status: 413 });
  if (!ALLOWED.test(file.type)) return NextResponse.json({ error: "Please upload a photo (JPG, PNG, WEBP, HEIC) or a PDF." }, { status: 415 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const storageKey = `gsc:file:${newId("blob")}`;
  await getStorage().setBytes(storageKey, bytes);

  const result = await mutate((db) => {
    const project = db.projects.find((p) => p.id === projectId);
    if (!project || !canView(user, project)) return { error: "Project not found.", status: 404 } as const;
    if (plotId && !db.plots.some((p) => p.id === plotId && p.projectId === projectId)) {
      return { error: "Plot not found.", status: 404 } as const;
    }
    let replaced: StoredDocument | undefined;
    if (replaceId) {
      replaced = db.documents.find((d) => d.id === replaceId && d.projectId === projectId);
      db.documents = db.documents.filter((d) => d !== replaced);
    }
    const now = new Date().toISOString();
    const doc: StoredDocument = {
      id: newId("doc"),
      projectId,
      plotId,
      category,
      filename: file.name.slice(0, 160) || "upload",
      mimeType: file.type,
      size: file.size,
      storageKey,
      uploadedById: user.id,
      status: "received",
      createdAt: now,
    };
    db.documents.push(doc);
    const plotName = plotId ? db.plots.find((p) => p.id === plotId)?.name : undefined;
    const label = DOCUMENT_CATEGORY[category].label.toLowerCase();

    if (user.role === "customer") {
      addActivity(db, {
        projectId,
        plotId,
        visibility: "customer",
        actorId: user.id,
        message: `Thanks! We've received your ${label}${plotName ? ` for ${plotName}` : ""}.`,
      });
      // If this upload answers an outstanding request, close it and tell staff.
      const task = db.tasks.find(
        (t) =>
          t.projectId === projectId &&
          t.audience === "customer" &&
          t.status === "open" &&
          (taskId ? t.id === taskId : t.documentCategory === category && (!t.plotIds || !plotId || t.plotIds.includes(plotId))),
      );
      if (task) {
        const allPlotsCovered =
          !task.plotIds ||
          task.plotIds.every((pid) =>
            db.documents.some((d) => d.projectId === projectId && d.category === task.documentCategory && d.plotId === pid),
          );
        if (allPlotsCovered || taskId) {
          task.status = "done";
          task.completedAt = now;
        }
      }
      db.tasks.push({
        id: newId("tsk"),
        projectId,
        audience: "internal",
        title: `Review uploaded ${label}${plotName ? ` (${plotName})` : ""}`,
        status: "open",
        createdById: user.id,
        createdAt: now,
      });
      if (project.status === "awaiting_customer" && !db.tasks.some((t) => t.projectId === projectId && t.audience === "customer" && t.status === "open")) {
        project.status = "in_progress";
      }
    } else {
      addActivity(db, { projectId, plotId, visibility: "internal", actorId: user.id, message: `Staff uploaded ${doc.filename}.` });
      notifyProject(db, projectId, { type: "update", title: "New document added", body: `We've added “${doc.filename}” to ${project.name}.` });
    }
    touch(db, projectId);
    return { doc, replaced } as const;
  });

  if ("error" in result) {
    await getStorage().delete(storageKey);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (result.replaced) await getStorage().delete(result.replaced.storageKey);
  const { storageKey: _k, ...publicDoc } = result.doc;
  void _k;
  return NextResponse.json({ document: publicDoc });
}
