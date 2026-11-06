"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Download, Eye, FileText, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { deleteDocument } from "@/app/actions/customer";
import type { DocumentCategory } from "@/lib/db/types";
import { DOCUMENT_CATEGORY } from "@/lib/domain";
import { buttonClass } from "./ui";

export interface DocView {
  id: string;
  filename: string;
  category: DocumentCategory;
  mimeType: string;
  size: number;
  plotName?: string;
  status: "received" | "accepted" | "needs_replacement";
  createdAt: string;
  uploadedLabel: string;
}

const MAX = 4 * 1024 * 1024;
const OK = /^(image\/(png|jpe?g|webp|heic|heif|gif)|application\/pdf)$/;

async function upload(fd: FormData): Promise<string | null> {
  const res = await fetch("/api/documents", { method: "POST", body: fd });
  if (res.ok) return null;
  const j = await res.json().catch(() => ({}));
  return j.error ?? "Upload failed. Please try again.";
}

function check(file: File): string | null {
  if (file.size > MAX) return `“${file.name}” is over 4 MB. Please choose a smaller file.`;
  if (!OK.test(file.type)) return `“${file.name}” isn't a photo or PDF.`;
  return null;
}

export function DocumentUploader({
  projectId,
  plots,
  defaultCategory = "other",
  defaultPlotId,
  taskId,
  compact = false,
  label = "Upload files",
}: {
  projectId: string;
  plots: { id: string; name: string }[];
  defaultCategory?: DocumentCategory;
  defaultPlotId?: string;
  taskId?: string;
  compact?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory);
  const [plotId, setPlotId] = useState(defaultPlotId ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const idBase = `up-${taskId ?? projectId}-${defaultPlotId ?? "all"}`;

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setMsg(null);
    let failed: string | null = null;
    let count = 0;
    for (const file of Array.from(files)) {
      const bad = check(file);
      if (bad) { failed = bad; continue; }
      const fd = new FormData();
      fd.set("file", file);
      fd.set("projectId", projectId);
      fd.set("category", category);
      if (plotId) fd.set("plotId", plotId);
      if (taskId) fd.set("taskId", taskId);
      const err = await upload(fd);
      if (err) failed = err; else count++;
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    setMsg(failed ? { ok: false, text: failed } : { ok: true, text: `Thanks! ${count} file${count === 1 ? "" : "s"} uploaded.` });
    router.refresh();
  };

  return (
    <div className={compact ? "" : "rounded-3xl bg-cream-100 p-5"}>
      <div className={`flex flex-col gap-3 ${compact ? "" : "sm:flex-row sm:items-end"}`}>
        {!compact && (
          <div className="flex-1">
            <label htmlFor={`${idBase}-cat`} className="block text-sm font-bold">Document type</label>
            <select id={`${idBase}-cat`} className="field-input mt-1.5" value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)}>
              {Object.entries(DOCUMENT_CATEGORY).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        )}
        {!compact && plots.length > 1 && (
          <div className="flex-1">
            <label htmlFor={`${idBase}-plot`} className="block text-sm font-bold">For which plot?</label>
            <select id={`${idBase}-plot`} className="field-input mt-1.5" value={plotId} onChange={(e) => setPlotId(e.target.value)}>
              <option value="">Whole development</option>
              {plots.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        <label className={`${buttonClass(compact ? "dark" : "primary", compact ? "sm" : "md")} cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-navy-700`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
          {busy ? "Uploading…" : label}
          <input ref={input} type="file" multiple accept="image/*,application/pdf" className="sr-only" disabled={busy} onChange={(e) => onFiles(e.target.files)} />
        </label>
      </div>
      <div aria-live="polite">
        {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm font-semibold ${msg.ok ? "text-emerald-800" : "text-coral-700"}`}>{msg.text}</p>}
      </div>
      {!compact && <p className="mt-2 text-xs text-navy-900/55">Photos or PDFs up to 4 MB each.</p>}
    </div>
  );
}

export function DocumentList({ projectId, docs, canEdit }: { projectId: string; docs: DocView[]; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const replace = async (doc: DocView, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const bad = check(file);
    if (bad) return setError(bad);
    setBusyId(doc.id);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("projectId", projectId);
    fd.set("category", doc.category);
    fd.set("replaceId", doc.id);
    const err = await upload(fd);
    setBusyId(null);
    setError(err);
    router.refresh();
  };

  if (!docs.length) return <p className="rounded-2xl bg-cream-100 p-4 text-sm text-navy-900/70">No documents yet. Upload plans and photos here whenever you have them.</p>;
  return (
    <>
      {error && <p role="alert" className="mb-2 text-sm font-semibold text-coral-700">{error}</p>}
      <ul className="divide-y divide-navy-900/5">
        {docs.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-cream-100">
              {d.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/documents/${d.id}`} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <FileText className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{d.filename}</p>
              <p className="text-xs text-navy-900/60">
                {DOCUMENT_CATEGORY[d.category].label}{d.plotName ? ` · ${d.plotName}` : ""} · {(d.size / 1024 / 1024).toFixed(1)} MB · {d.uploadedLabel}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${d.status === "accepted" ? "bg-emerald-100 text-emerald-900" : d.status === "needs_replacement" ? "bg-coral-100 text-coral-800" : "bg-navy-900/5"}`}>
              {d.status === "accepted" ? "Accepted" : d.status === "needs_replacement" ? "Needs replacing" : "Received"}
            </span>
            <div className="flex items-center">
              <a href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full hover:bg-navy-900/5" title="Preview">
                <Eye className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Preview {d.filename}</span>
              </a>
              <a href={`/api/documents/${d.id}?download`} className="grid h-9 w-9 place-items-center rounded-full hover:bg-navy-900/5" title="Download">
                <Download className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Download {d.filename}</span>
              </a>
              {canEdit && (
                <>
                  <label className="grid h-9 w-9 cursor-pointer place-items-center rounded-full hover:bg-navy-900/5 has-[:focus-visible]:outline-3" title="Replace">
                    {busyId === d.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                    <span className="sr-only">Replace {d.filename}</span>
                    <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => replace(d, e.target.files)} />
                  </label>
                  <button
                    type="button"
                    disabled={pending}
                    className="grid h-9 w-9 place-items-center rounded-full hover:bg-coral-50"
                    title="Remove"
                    onClick={() => {
                      if (!confirm(`Remove “${d.filename}”?`)) return;
                      start(async () => {
                        await deleteDocument(d.id);
                        router.refresh();
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-coral-700" aria-hidden="true" /><span className="sr-only">Remove {d.filename}</span>
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
