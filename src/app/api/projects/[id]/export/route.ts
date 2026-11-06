import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readDb } from "@/lib/db/store";
import { currentMilestone, currentStage, formatDate, isComplete, milestoneTitle, RESPONSIBILITY } from "@/lib/domain";
import { canView, projectDetail } from "@/lib/repo/views";
import type { Connection } from "@/lib/db/types";

export const runtime = "nodejs";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  // Quote, and neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

const status = (c?: Connection) => {
  if (!c) return "Not requested";
  if (isComplete(c)) return "Connected";
  const m = currentMilestone(c);
  return `Stage ${currentStage(c)}/6: ${milestoneTitle(m.key)} (${RESPONSIBILITY[m.responsible].label})`;
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const db = await readDb();
  const project = db.projects.find((p) => p.id === id);
  if (!project || !canView(user, project)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const d = projectDetail(db, user, id);
  const supplierName = (sid?: string) => d.suppliers.find((s) => s.id === sid)?.name ?? "";

  const header = ["Plot", "Address", "Electricity status", "Gas status", "MPAN", "MPRN", "Supplier", "Meter appointment", "Outstanding actions"];
  const lines = d.rows.map((r) => {
    const e = r.connections.electricity;
    const g = r.connections.gas;
    const appt = r.appointments.find((a) => a.status === "booked");
    return [
      r.plot.name,
      r.plot.address ?? "",
      status(e),
      status(g),
      e?.meterPointNumber ?? "",
      g?.meterPointNumber ?? "",
      supplierName(e?.supplierId ?? g?.supplierId ?? project.supplierId),
      appt ? formatDate(appt.date) : "",
      r.openTasks.map((t) => t.title).join("; "),
    ].map(cell).join(",");
  });
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  const filename = `${project.reference}-${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
