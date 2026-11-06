import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorage } from "@/lib/db/storage";
import { readDb } from "@/lib/db/store";
import { canView } from "@/lib/repo/views";

export const runtime = "nodejs";

// Every download is checked against the signed-in user — customers can only
// fetch documents that belong to their own organisation's projects.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const db = await readDb();
  const doc = db.documents.find((d) => d.id === id);
  const project = doc && db.projects.find((p) => p.id === doc.projectId);
  if (!doc || !project || !canView(user, project)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const bytes = await getStorage().getBytes(doc.storageKey);
  if (!bytes) return NextResponse.json({ error: "File is no longer available." }, { status: 410 });
  const download = new URL(req.url).searchParams.has("download");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${doc.filename.replace(/["\\\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
