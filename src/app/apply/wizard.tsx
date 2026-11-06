"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Pencil, Save, ShieldCheck } from "lucide-react";
import { saveDraft, submitApplication } from "@/app/actions/application";
import { Sparky } from "@/components/brand";
import { buttonClass, Field } from "@/components/ui";
import {
  type ApplicationData,
  emptyApplication,
  type Errors,
  isMulti,
  plotNames,
  STEPS,
  validateStep,
} from "@/lib/application";
import { formatDate, PROJECT_TYPE_LABEL, STARTING_POINT_LABEL, UTILITY_LABEL } from "@/lib/domain";
import { brand } from "@/lib/brand";
import {
  DocumentsStep,
  type PendingFile,
  ProgressStep,
  PropertyStep,
  RequirementsStep,
  TypeStep,
  type Update,
  UtilitiesStep,
  utilityList,
} from "./steps";
import { DOCUMENT_CATEGORY } from "@/lib/domain";

const STORE_KEY = "gsc:application:v1";

const encouragements = [
  "New property? Let's get you connected.",
  "Tell us a little about your place.",
  "Pick what you need.",
  "Not sure? No worries — we can help.",
  "You're one step closer!",
  "Nearly there — add anything you have to hand.",
  "Last bit! Check everything looks right.",
];

interface Props {
  user: { name: string; email: string; phone?: string } | null;
  serverDraft: { data: ApplicationData; step: number } | null;
}

export function Wizard({ user, serverDraft }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ApplicationData>(emptyApplication);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [restored, setRestored] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [phase, setPhase] = useState<"editing" | "submitting" | "uploading" | "done">("editing");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0, failed: 0 });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const loaded = useRef(false);

  // Restore saved progress (server draft for signed-in customers, else this device).
  useEffect(() => {
    let draft = serverDraft;
    if (!draft) {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) draft = JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    if (draft?.data) {
      const base = emptyApplication();
      const merged: ApplicationData = {
        ...base,
        ...draft.data,
        property: { ...base.property, ...draft.data.property, siteContact: { ...base.property.siteContact, ...draft.data.property?.siteContact } },
        progress: { ...base.progress, ...draft.data.progress },
        requirements: { ...base.requirements, ...draft.data.requirements },
        contact: { ...base.contact, ...draft.data.contact, password: "" },
      };
      setData(merged);
      setStep(Math.min(Math.max(0, draft.step ?? 0), STEPS.length - 1));
      setRestored(true);
    }
    if (user) {
      setData((d) => ({ ...d, contact: { ...d.contact, name: d.contact.name || user.name, email: user.email, phone: d.contact.phone || user.phone || "" } }));
    }
    loaded.current = true;
  }, [serverDraft, user]);

  // Autosave to this device as they go (never the password).
  useEffect(() => {
    if (!loaded.current || phase !== "editing") return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({ step, data: { ...data, contact: { ...data.contact, password: "" } } }));
      } catch {
        /* storage may be unavailable */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [data, step, phase]);

  useEffect(() => {
    if (loaded.current) headingRef.current?.focus();
  }, [step]);

  const update: Update = useCallback((fn) => {
    setErrors((e) => (Object.keys(e).length ? {} : e));
    setData((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const go = (to: number) => {
    setErrors({});
    setSubmitError(null);
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    const e = validateStep(STEPS[step].key, data, { signedIn: !!user });
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>("[aria-invalid='true'], [role='alert']");
        first?.focus?.();
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    go(step + 1);
  };

  const saveForLater = async () => {
    if (user) {
      const r = await saveDraft({ step, data: { ...data, contact: { ...data.contact, password: "" } } });
      setSaved(r.ok ? "Saved to your account. Pick up where you left off any time." : "Saved on this device.");
    } else {
      setSaved("Saved on this device. Come back to this page any time to carry on.");
    }
    setTimeout(() => setSaved(null), 5000);
  };

  const submit = async () => {
    const e = validateStep("review", data, { signedIn: !!user });
    setErrors(e);
    if (Object.keys(e).length) return;
    setPhase("submitting");
    setSubmitError(null);
    const res = await submitApplication(data);
    if (!res.ok) {
      setPhase("editing");
      setSubmitError(res.error);
      if (res.errors) setErrors(res.errors);
      return;
    }
    // Upload any files now the project exists.
    if (files.length) {
      setPhase("uploading");
      setUploadProgress({ done: 0, total: files.length, failed: 0 });
      let failed = 0;
      for (const [i, f] of files.entries()) {
        const fd = new FormData();
        fd.set("file", f.file);
        fd.set("projectId", res.projectId);
        fd.set("category", f.category);
        const ok = await fetch("/api/documents", { method: "POST", body: fd }).then((r) => r.ok).catch(() => false);
        if (!ok) failed++;
        setUploadProgress({ done: i + 1, total: files.length, failed });
      }
    }
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* ignore */
    }
    files.forEach((f) => URL.revokeObjectURL(f.url));
    setPhase("done");
    setTimeout(() => router.push(`/portal/projects/${res.projectId}?welcome=1`), 4000);
    // Remember where to go if they click.
    (window as unknown as { __gscProject?: string }).__gscProject = res.projectId;
  };

  if (phase === "done") {
    const pid = (typeof window !== "undefined" && (window as unknown as { __gscProject?: string }).__gscProject) || "";
    return (
      <div className="mx-auto max-w-xl py-10 text-center animate-rise" role="status" aria-live="polite">
        <Sparky className="mx-auto h-48 w-48 animate-float" mood="cheer" />
        <h1 className="mt-4 text-4xl font-extrabold">You&apos;re all set!</h1>
        <p className="mt-3 text-xl text-navy-900/75">We&apos;ve got your request. Now let us take care of the complicated bits.</p>
        {uploadProgress.failed > 0 && (
          <p className="mt-4 rounded-2xl bg-coral-50 p-3 text-sm font-semibold text-coral-800">{uploadProgress.failed} file(s) didn&apos;t upload. You can add them from your dashboard.</p>
        )}
        <p className="mt-6 text-sm text-navy-900/60">Taking you to My Connections…</p>
        <Link href={pid ? `/portal/projects/${pid}?welcome=1` : "/portal"} className={buttonClass("dark", "lg", "mt-4")}>
          Go to My Connections <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const current = STEPS[step];
  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress header */}
      <div className="sticky top-0 z-30 -mx-4 bg-cream-100/90 px-4 pt-3 pb-4 backdrop-blur sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span className="text-navy-900/60">{current.title}</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-navy-900/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Application progress">
          <div className="h-full rounded-full bg-gradient-to-r from-lime-500 to-lime-400 transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <ol className="mt-3 hidden gap-1 sm:flex" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex-1">
              <button
                type="button"
                disabled={i > step}
                onClick={() => go(i)}
                aria-current={i === step ? "step" : undefined}
                className={`w-full truncate rounded-full px-2 py-1 text-xs font-bold transition ${i === step ? "bg-navy-900 text-white" : i < step ? "bg-lime-200 hover:bg-lime-300" : "text-navy-900/40"}`}
              >
                {i < step ? "✓ " : ""}{s.title}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {restored && step > 0 && (
        <p className="mb-4 rounded-2xl bg-sky-100 px-4 py-3 text-sm font-semibold text-sky-900 animate-rise">Welcome back! We saved your progress, so you can carry on where you left off.</p>
      )}

      <section key={step} className="animate-rise" aria-labelledby="step-title">
        <p className="mt-4 text-sm font-bold text-coral-600">{encouragements[step]}</p>
        <h1 id="step-title" ref={headingRef} tabIndex={-1} className="mt-1 text-3xl font-extrabold outline-none sm:text-4xl">{current.title}</h1>
        <div className="mt-8">
          {current.key === "type" && <TypeStep data={data} update={update} errors={errors} />}
          {current.key === "property" && <PropertyStep data={data} update={update} errors={errors} />}
          {current.key === "utilities" && <UtilitiesStep data={data} update={update} errors={errors} />}
          {current.key === "progress" && <ProgressStep data={data} update={update} errors={errors} />}
          {current.key === "requirements" && <RequirementsStep data={data} update={update} errors={errors} />}
          {current.key === "documents" && <DocumentsStep data={data} update={update} errors={errors} files={files} setFiles={setFiles} />}
          {current.key === "review" && <Review data={data} update={update} errors={errors} files={files} go={go} user={user} />}
        </div>
      </section>

      {submitError && (
        <div role="alert" className="mt-6 rounded-2xl bg-coral-50 p-4 text-sm font-semibold text-coral-800">
          {submitError}{" "}
          {submitError.includes("sign in") && <Link className="underline" href="/sign-in?next=/apply">Sign in</Link>}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-10 flex flex-col-reverse gap-3 border-t border-navy-900/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {step > 0 && (
            <button type="button" onClick={() => go(step - 1)} className={buttonClass("ghost", "md")}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
            </button>
          )}
          <button type="button" onClick={saveForLater} className={buttonClass("ghost", "md")}>
            <Save className="h-4 w-4" aria-hidden="true" /> Save and finish later
          </button>
        </div>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next} className={buttonClass("primary", "lg")}>
            Continue <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={phase !== "editing"} className={buttonClass("dark", "lg")}>
            {phase === "submitting" ? (
              <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Sending…</>
            ) : phase === "uploading" ? (
              <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Uploading {uploadProgress.done}/{uploadProgress.total}…</>
            ) : (
              <>Submit my request <CheckCircle2 className="h-5 w-5" aria-hidden="true" /></>
            )}
          </button>
        )}
      </div>
      <div aria-live="polite">{saved && <p className="mt-3 text-sm font-semibold text-emerald-800 animate-rise">{saved}</p>}</div>
    </div>
  );
}

function Review({
  data,
  update,
  errors,
  files,
  go,
  user,
}: {
  data: ApplicationData;
  update: Update;
  errors: Errors;
  files: PendingFile[];
  go: (n: number) => void;
  user: Props["user"];
}) {
  const p = data.property;
  const plots = plotNames(data);
  const Section = ({ title, step, children }: { title: string; step: number; children: React.ReactNode }) => (
    <div className="rounded-3xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">{title}</h2>
        <button type="button" onClick={() => go(step)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold hover:bg-navy-900/5">
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit<span className="sr-only"> {title}</span>
        </button>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-[10rem_1fr]">{children}</dl>
    </div>
  );
  const Row = ({ k, v }: { k: string; v?: React.ReactNode }) => (
    <>
      <dt className="font-semibold text-navy-900/60">{k}</dt>
      <dd className="font-semibold">{v || "—"}</dd>
    </>
  );
  const inv = (k: string) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });
  return (
    <div className="space-y-4">
      <Section title="What we're connecting" step={0}>
        <Row k="Project" v={data.projectType && PROJECT_TYPE_LABEL[data.projectType]} />
      </Section>
      <Section title="The property" step={1}>
        <Row k={isMulti(data) ? "Development" : "Name"} v={p.name} />
        <Row k={p.noAddress ? "Site" : "Address"} v={p.noAddress ? p.siteDescription : [p.addressLine, p.town].filter(Boolean).join(", ")} />
        <Row k="Postcode" v={p.postcode.toUpperCase()} />
        {isMulti(data) && <Row k="Plots" v={`${plots.length}: ${plots.slice(0, 3).map((x) => x.name).join(", ")}${plots.length > 3 ? "…" : ""}`} />}
        <Row k="Site contact" v={p.contactIsMe ? "You" : `${p.siteContact.name} ${p.siteContact.phone}`} />
      </Section>
      <Section title="Utilities" step={2}>
        <Row k="Connecting" v={utilityList(data.utilities)} />
        {data.interestedIn.length > 0 && <Row k="Interested in" v={data.interestedIn.join(", ")} />}
      </Section>
      <Section title="How far along" step={3}>
        {data.utilities.map((u) => (
          <Row key={u} k={UTILITY_LABEL[u]} v={data.progress[u] && STARTING_POINT_LABEL[data.progress[u]!]} />
        ))}
      </Section>
      <Section title="Requirements" step={4}>
        <Row k="Connected by" v={data.requirements.desiredCompletionDate ? formatDate(data.requirements.desiredCompletionDate) : "Not sure yet"} />
        <Row k="Site ready" v={{ yes: "Yes", no: "Not yet", not_sure: "Not sure" }[data.requirements.siteReady ?? "not_sure"]} />
        {data.requirements.accessNotes && <Row k="Notes" v={data.requirements.accessNotes} />}
      </Section>
      <Section title="Documents" step={5}>
        <Row k="Attached" v={files.length ? files.map((f) => `${f.file.name} (${DOCUMENT_CATEGORY[f.category].label})`).join(", ") : "None yet — you can add them later"} />
      </Section>

      <div className="rounded-3xl bg-navy-900 p-6 text-white on-dark">
        <h2 className="text-xl font-extrabold">Your details</h2>
        {user ? (
          <p className="mt-1 text-white/70">Signed in as <strong className="text-white">{user.email}</strong>.</p>
        ) : (
          <p className="mt-1 text-white/70">We&apos;ll create your account so you can track everything. Already have one? <Link href="/sign-in?next=/apply" className="font-bold text-lime-400 underline">Sign in</Link> — your answers are saved.</p>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 [&_label]:text-white [&_p]:text-white/70">
          <Field label="Your name" htmlFor="contactName" error={errors.contactName}>
            <input id="contactName" autoComplete="name" className="field-input" value={data.contact.name} onChange={(e) => update((d) => void (d.contact.name = e.target.value))} {...inv("contactName")} />
          </Field>
          <Field label="Phone" htmlFor="contactPhone" optional error={errors.contactPhone}>
            <input id="contactPhone" type="tel" autoComplete="tel" className="field-input" value={data.contact.phone} onChange={(e) => update((d) => void (d.contact.phone = e.target.value))} {...inv("contactPhone")} />
          </Field>
          {!user && (
            <>
              <Field label="Email" htmlFor="contactEmail" error={errors.contactEmail}>
                <input id="contactEmail" type="email" autoComplete="email" className="field-input" value={data.contact.email} onChange={(e) => update((d) => void (d.contact.email = e.target.value))} {...inv("contactEmail")} />
              </Field>
              <Field label="Choose a password" htmlFor="contactPassword" hint="At least 8 characters." error={errors.contactPassword}>
                <input id="contactPassword" type="password" autoComplete="new-password" className="field-input" value={data.contact.password} onChange={(e) => update((d) => void (d.contact.password = e.target.value))} {...inv("contactPassword")} />
              </Field>
              <Field label="Company" htmlFor="contactCompany" optional>
                <input id="contactCompany" autoComplete="organization" className="field-input" value={data.contact.company} onChange={(e) => update((d) => void (d.contact.company = e.target.value))} />
              </Field>
            </>
          )}
        </div>
        <label className="mt-6 flex items-start gap-3 rounded-2xl bg-white/10 p-4">
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-lime-400" checked={data.contact.consent} onChange={(e) => update((d) => void (d.contact.consent = e.target.checked))} {...inv("consent")} />
          <span className="text-sm text-white/90">
            <strong className="block text-white">I give {brand.name} permission to coordinate these connections for me.</strong>
            This means we can contact network operators, energy suppliers and meter installers on your behalf and share the details you&apos;ve given us with them. We&apos;ll never agree to charges without asking you first.
          </span>
        </label>
        {errors.consent && <p id="consent-error" role="alert" className="mt-2 text-sm font-semibold text-coral-200">{errors.consent}</p>}
        <p className="mt-4 flex items-center gap-2 text-xs text-white/60"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Our coordination is free. Network and other third-party charges may apply.</p>
      </div>
    </div>
  );
}
