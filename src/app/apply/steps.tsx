"use client";
import { useRef } from "react";
import {
  Building2,
  Droplets,
  FileText,
  Flame,
  Home,
  HousePlus,
  ImageIcon,
  Minus,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Warehouse,
  Wifi,
  Zap,
} from "lucide-react";
import type { DocumentCategory, StartingPoint, Utility } from "@/lib/db/types";
import { type ApplicationData, type Errors, isMulti, plotNames } from "@/lib/application";
import {
  DOCUMENT_CATEGORY,
  METER_NUMBER,
  NETWORK_EXPLAINER,
  PROJECT_TYPE_LABEL,
  STARTING_POINT_LABEL,
  UTILITY_LABEL,
} from "@/lib/domain";
import { Field } from "@/components/ui";
import { ChoiceCard, Explainer, RadioPills } from "./controls";

export type Update = (fn: (d: ApplicationData) => void) => void;
export interface StepProps {
  data: ApplicationData;
  update: Update;
  errors: Errors;
}

const inv = (errors: Errors, k: string) => ({
  "aria-invalid": !!errors[k],
  "aria-describedby": errors[k] ? `${k}-error` : undefined,
});

// ── Step 1 ────────────────────────────────────────────────────────────────
export function TypeStep({ data, update, errors }: StepProps) {
  const opts = [
    { v: "new_home", icon: <Home className="h-7 w-7" />, tone: "bg-lime-300", body: "A self-build or a single new house." },
    { v: "multiple_homes", icon: <Building2 className="h-7 w-7" />, tone: "bg-coral-200", body: "A development of 2 to 50 homes." },
    { v: "conversion", icon: <HousePlus className="h-7 w-7" />, tone: "bg-sky-200", body: "Turning a building into flats or new homes." },
    { v: "existing_property", icon: <Warehouse className="h-7 w-7" />, tone: "bg-violet-200", body: "A property that needs a new or first supply." },
  ] as const;
  return (
    <fieldset aria-describedby={errors.projectType ? "projectType-error" : undefined}>
      <legend className="sr-only">What are we connecting?</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {opts.map((o) => (
          <ChoiceCard
            key={o.v}
            name="projectType"
            value={o.v}
            checked={data.projectType === o.v}
            onChange={() =>
              update((d) => {
                d.projectType = o.v;
                if (o.v === "multiple_homes" && d.property.plotCount < 2) d.property.plotCount = 2;
                if (o.v === "conversion" && d.property.plotCount < 2) d.property.plotCount = 2;
              })
            }
            title={PROJECT_TYPE_LABEL[o.v]}
            body={o.body}
            icon={o.icon}
            tone={o.tone}
          />
        ))}
      </div>
      {errors.projectType && <p id="projectType-error" role="alert" className="mt-3 text-sm font-semibold text-coral-700">{errors.projectType}</p>}
    </fieldset>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────────────
export function PropertyStep({ data, update, errors }: StepProps) {
  const p = data.property;
  const multi = isMulti(data);
  const names = plotNames(data);
  return (
    <div className="space-y-6">
      <Field
        label={multi ? "Development name" : "What do you call the property?"}
        hint={multi ? "Even a working title is fine, e.g. ‘The Orchard’." : "E.g. ‘Willow Cottage’ or ‘12 High Street’."}
        htmlFor="name"
        error={errors.name}
      >
        <input id="name" className="field-input" value={p.name} onChange={(e) => update((d) => void (d.property.name = e.target.value))} {...inv(errors, "name")} />
      </Field>

      <label className="flex items-start gap-3 rounded-2xl bg-cream-100 p-4">
        <input type="checkbox" className="mt-1 h-5 w-5 accent-navy-900" checked={p.noAddress} onChange={(e) => update((d) => void (d.property.noAddress = e.target.checked))} />
        <span>
          <span className="block font-bold">There&apos;s no postal address yet</span>
          <span className="block text-sm text-navy-900/65">Common for new builds. Describe the site instead and we&apos;ll take it from there.</span>
        </span>
      </label>

      {p.noAddress ? (
        <Field label="Describe where the site is" hint="E.g. ‘Field behind 4 Hollow Lane, entrance via the farm track’." htmlFor="siteDescription" error={errors.siteDescription}>
          <textarea id="siteDescription" rows={3} className="field-input" value={p.siteDescription} onChange={(e) => update((d) => void (d.property.siteDescription = e.target.value))} {...inv(errors, "siteDescription")} />
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address" htmlFor="addressLine" error={errors.addressLine}>
            <input id="addressLine" autoComplete="address-line1" className="field-input" value={p.addressLine} onChange={(e) => update((d) => void (d.property.addressLine = e.target.value))} {...inv(errors, "addressLine")} />
          </Field>
          <Field label="Town or city" htmlFor="town" optional>
            <input id="town" autoComplete="address-level2" className="field-input" value={p.town} onChange={(e) => update((d) => void (d.property.town = e.target.value))} />
          </Field>
        </div>
      )}

      <Field label="Postcode" hint="The nearest postcode is fine for a new site. It tells us which network companies cover your area." htmlFor="postcode" error={errors.postcode}>
        <input id="postcode" autoComplete="postal-code" className="field-input max-w-xs uppercase" value={p.postcode} onChange={(e) => update((d) => void (d.property.postcode = e.target.value))} {...inv(errors, "postcode")} />
      </Field>

      {multi && (
        <div className="rounded-3xl bg-cream-100 p-5">
          <Field label={data.projectType === "conversion" ? "How many units?" : "How many properties or plots?"} hint="Between 2 and 50. You can add more later." htmlFor="plotCount" error={errors.plotCount}>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="One fewer" className="grid h-11 w-11 place-items-center rounded-full bg-white ring-1 ring-navy-900/15 hover:ring-navy-900/40" onClick={() => update((d) => void (d.property.plotCount = Math.max(2, d.property.plotCount - 1)))}>
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <input id="plotCount" type="number" inputMode="numeric" min={2} max={50} className="field-input w-24 text-center text-lg font-bold" value={p.plotCount} onChange={(e) => update((d) => void (d.property.plotCount = Math.min(50, Math.max(0, Number(e.target.value) || 0))))} {...inv(errors, "plotCount")} />
              <button type="button" aria-label="One more" className="grid h-11 w-11 place-items-center rounded-full bg-white ring-1 ring-navy-900/15 hover:ring-navy-900/40" onClick={() => update((d) => void (d.property.plotCount = Math.min(50, d.property.plotCount + 1)))}>
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </Field>
          {p.plotCount >= 2 && p.plotCount <= 50 && (
            <details className="mt-4" open={p.plotCount <= 6}>
              <summary className="cursor-pointer text-sm font-bold">Name your plots ({names.length}) — optional</summary>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {names.map((n, i) => (
                  <li key={i}>
                    <label className="sr-only" htmlFor={`plot-${i}`}>Plot {i + 1} name</label>
                    <input
                      id={`plot-${i}`}
                      className="field-input py-2 text-sm"
                      value={p.plots[i]?.name ?? ""}
                      placeholder={n.name}
                      onChange={(e) =>
                        update((d) => {
                          d.property.plots[i] = { name: e.target.value, address: d.property.plots[i]?.address ?? "" };
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-navy-900" checked={p.contactIsMe} onChange={(e) => update((d) => void (d.property.contactIsMe = e.target.checked))} />
          <span className="font-bold">I&apos;m the site contact</span>
        </label>
        {!p.contactIsMe && (
          <div className="mt-4 grid gap-4 animate-rise sm:grid-cols-3">
            <Field label="Site contact name" htmlFor="siteContactName" error={errors.siteContactName}>
              <input id="siteContactName" className="field-input" value={p.siteContact.name} onChange={(e) => update((d) => void (d.property.siteContact.name = e.target.value))} {...inv(errors, "siteContactName")} />
            </Field>
            <Field label="Phone" htmlFor="siteContactPhone" optional>
              <input id="siteContactPhone" type="tel" className="field-input" value={p.siteContact.phone} onChange={(e) => update((d) => void (d.property.siteContact.phone = e.target.value))} />
            </Field>
            <Field label="Email" htmlFor="siteContactEmail" optional>
              <input id="siteContactEmail" type="email" className="field-input" value={p.siteContact.email} onChange={(e) => update((d) => void (d.property.siteContact.email = e.target.value))} />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 3 ────────────────────────────────────────────────────────────────
export function UtilitiesStep({ data, update, errors }: StepProps) {
  const toggle = (u: Utility, on: boolean) =>
    update((d) => {
      d.utilities = on ? Array.from(new Set([...d.utilities, u])) : d.utilities.filter((x) => x !== u);
    });
  return (
    <div className="space-y-6">
      <fieldset aria-describedby={errors.utilities ? "utilities-error" : undefined}>
        <legend className="text-base font-bold">Choose one or both</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <ChoiceCard type="checkbox" name="utilities" value="electricity" checked={data.utilities.includes("electricity")} onChange={(c) => toggle("electricity", c)} title="Electricity" body="New supply, MPAN and meter." icon={<Zap className="h-7 w-7" />} tone="bg-lime-300" />
          <ChoiceCard type="checkbox" name="utilities" value="gas" checked={data.utilities.includes("gas")} onChange={(c) => toggle("gas", c)} title="Gas" body="New service pipe, MPRN and meter." icon={<Flame className="h-7 w-7" />} tone="bg-coral-200" />
        </div>
        {errors.utilities && <p id="utilities-error" role="alert" className="mt-3 text-sm font-semibold text-coral-700">{errors.utilities}</p>}
      </fieldset>
      <div>
        <p className="text-base font-bold">Coming soon</p>
        <p className="text-sm text-navy-900/60">We can&apos;t take applications for these yet. Tick to let us know you&apos;re interested.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {([
            ["water", "Water", <Droplets key="w" className="h-5 w-5" aria-hidden="true" />],
            ["broadband", "Broadband", <Wifi key="b" className="h-5 w-5" aria-hidden="true" />],
          ] as const).map(([k, label, icon]) => (
            <label key={k} className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-navy-900/15 bg-white/60 px-4 py-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900/5">{icon}</span>
              <span className="flex-1">
                <span className="block font-bold">{label} <span className="ml-1 rounded-full bg-navy-900/5 px-2 py-0.5 text-xs">Coming soon</span></span>
                <span className="block text-sm text-navy-900/60">Keep me posted</span>
              </span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-navy-900"
                checked={data.interestedIn.includes(k)}
                onChange={(e) =>
                  update((d) => {
                    d.interestedIn = e.target.checked ? [...d.interestedIn, k] : d.interestedIn.filter((x) => x !== k);
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 4 ────────────────────────────────────────────────────────────────
const STARTS: StartingPoint[] = ["scratch", "applied", "quoted", "works_underway", "ready_for_meters", "not_sure"];

export function ProgressStep({ data, update, errors }: StepProps) {
  return (
    <div className="space-y-8">
      {data.utilities.map((u) => {
        const v = data.progress[u];
        const hasRef = v && v !== "scratch" && v !== "not_sure";
        const meterKey = u === "electricity" ? "mpan" : "mprn";
        const refKey = u === "electricity" ? "electricityRef" : "gasRef";
        return (
          <div key={u} className="space-y-4 rounded-3xl bg-cream-100 p-5">
            <RadioPills
              name={u}
              columns
              legend={
                <span className="flex items-center gap-2">
                  {u === "electricity" ? <Zap className="h-5 w-5" aria-hidden="true" /> : <Flame className="h-5 w-5" aria-hidden="true" />}
                  Have you already arranged your {u} connection with the {u === "electricity" ? "electricity" : "gas"} network?
                </span>
              }
              options={STARTS.map((s) => ({ value: s, label: STARTING_POINT_LABEL[s] }))}
              value={v}
              onChange={(s) => update((d) => void (d.progress[u] = s))}
              error={errors[u]}
            />
            <Explainer title={u === "electricity" ? "What's the electricity network?" : "What's the gas network?"}>{NETWORK_EXPLAINER[u]}</Explainer>
            {hasRef && (
              <div className="grid gap-4 animate-rise sm:grid-cols-2">
                <Field label="Network reference" optional hint="If you have one from your quote or emails. No worries if not." htmlFor={refKey}>
                  <input id={refKey} className="field-input" value={data.progress[refKey]} onChange={(e) => update((d) => void (d.progress[refKey] = e.target.value))} />
                </Field>
                {(v === "works_underway" || v === "ready_for_meters") && (
                  <Field label={`${METER_NUMBER[u].short}`} optional hint={METER_NUMBER[u].explain} htmlFor={meterKey} error={errors[meterKey]}>
                    <input id={meterKey} inputMode="numeric" className="field-input" value={data.progress[meterKey]} onChange={(e) => update((d) => void (d.progress[meterKey] = e.target.value))} {...inv(errors, meterKey)} />
                  </Field>
                )}
              </div>
            )}
          </div>
        );
      })}
      <p className="text-sm text-navy-900/60">You never need to know reference numbers to get started — we&apos;ll find out everything else.</p>
    </div>
  );
}

// ── Step 5 ────────────────────────────────────────────────────────────────
type YNS = "yes" | "no" | "not_sure";
const yns = (labels?: [string, string, string]): { value: YNS; label: string }[] => [
  { value: "yes", label: labels?.[0] ?? "Yes" },
  { value: "no", label: labels?.[1] ?? "No" },
  { value: "not_sure", label: labels?.[2] ?? "I'm not sure" },
];

export function RequirementsStep({ data, update, errors }: StepProps) {
  const r = data.requirements;
  const existing = data.projectType === "existing_property" || data.projectType === "conversion";
  const meterOpts = [
    { value: "external_box" as const, label: "Outside, in a meter box", hint: "Most common for new builds" },
    { value: "internal" as const, label: "Inside the property" },
    { value: "not_sure" as const, label: "I'm not sure", hint: "We'll advise" },
  ];
  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="When would you like to be connected by?" optional hint="Helps us prioritise. We'll tell you honestly what's realistic." htmlFor="desiredCompletionDate" error={errors.desiredCompletionDate}>
          <input id="desiredCompletionDate" type="date" className="field-input" value={r.desiredCompletionDate?.slice(0, 10) ?? ""} onChange={(e) => update((d) => void (d.requirements.desiredCompletionDate = e.target.value || undefined))} {...inv(errors, "desiredCompletionDate")} />
        </Field>
      </div>
      <RadioPills name="siteReady" legend="Is the site ready for the network to work?" hint="E.g. clear access, groundworks done, trenches or ducts in place." options={yns(["Yes, ready", "Not yet", "I'm not sure"])} value={r.siteReady} onChange={(v) => update((d) => void (d.requirements.siteReady = v))} />
      {existing && (
        <RadioPills name="occupied" legend="Is anyone living in the property at the moment?" options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} value={r.occupied} onChange={(v) => update((d) => void (d.requirements.occupied = v))} />
      )}

      {data.utilities.includes("electricity") && (
        <div className="space-y-6 rounded-3xl bg-cream-100 p-5">
          <h3 className="flex items-center gap-2 text-lg font-extrabold"><Zap className="h-5 w-5" aria-hidden="true" /> Electricity</h3>
          <RadioPills
            name="phase"
            legend="What kind of supply do you need?"
            options={[
              { value: "single", label: "Single-phase", hint: "Standard for most homes" },
              { value: "three", label: "Three-phase", hint: "For big loads or several heat pumps" },
              { value: "not_sure", label: "I'm not sure", hint: "No problem — we'll work it out" },
            ]}
            value={r.electricity?.phase}
            onChange={(v) => update((d) => void (d.requirements.electricity = { ...d.requirements.electricity, phase: v }))}
          />
          <div className="grid gap-6 sm:grid-cols-2">
            <RadioPills name="ev" legend="Electric car charger planned?" options={yns()} value={r.electricity?.evCharger} onChange={(v) => update((d) => void (d.requirements.electricity = { ...d.requirements.electricity, evCharger: v }))} />
            <RadioPills name="hp" legend="Heat pump planned?" options={yns()} value={r.electricity?.heatPump} onChange={(v) => update((d) => void (d.requirements.electricity = { ...d.requirements.electricity, heatPump: v }))} />
          </div>
          <Explainer title="Why do we ask about chargers and heat pumps?">They use a lot of power, so the network needs to know when they size your connection. Telling them now avoids costly changes later.</Explainer>
          <RadioPills name="emeter" legend="Where would you like the electricity meter?" options={meterOpts} value={r.electricity?.meterLocation} onChange={(v) => update((d) => void (d.requirements.electricity = { ...d.requirements.electricity, meterLocation: v }))} />
        </div>
      )}

      {data.utilities.includes("gas") && (
        <div className="space-y-6 rounded-3xl bg-cream-100 p-5">
          <h3 className="flex items-center gap-2 text-lg font-extrabold"><Flame className="h-5 w-5" aria-hidden="true" /> Gas</h3>
          <RadioPills
            name="usage"
            legend="Roughly how much gas will you use?"
            options={[
              { value: "standard_home", label: "A typical home", hint: "Boiler and maybe a hob" },
              { value: "large_home", label: "A larger home", hint: "Big boiler, several bathrooms" },
              { value: "not_sure", label: "I'm not sure" },
            ]}
            value={r.gas?.usage}
            onChange={(v) => update((d) => void (d.requirements.gas = { ...d.requirements.gas, usage: v }))}
          />
          <RadioPills name="gmeter" legend="Where would you like the gas meter?" options={meterOpts} value={r.gas?.meterLocation} onChange={(v) => update((d) => void (d.requirements.gas = { ...d.requirements.gas, meterLocation: v }))} />
        </div>
      )}

      <Field label="Anything else we should know?" optional hint="Access arrangements, gate codes, site hours, technical details…" htmlFor="accessNotes">
        <textarea id="accessNotes" rows={3} className="field-input" value={r.accessNotes ?? ""} onChange={(e) => update((d) => void (d.requirements.accessNotes = e.target.value))} />
      </Field>
    </div>
  );
}

// ── Step 6 ────────────────────────────────────────────────────────────────
export interface PendingFile {
  id: string;
  category: DocumentCategory;
  file: File;
  url: string;
}

export function documentChecklist(data: ApplicationData) {
  const list: { category: DocumentCategory; need: "now" | "later" | "optional"; why: string }[] = [
    { category: "location_plan", need: "now", why: "The network needs this to process an application. Can't find one? Add it later." },
    { category: "site_plan", need: isMulti(data) ? "now" : "later", why: isMulti(data) ? "Shows where each plot and service will go." : "Helpful, but can follow." },
    { category: "meter_position", need: "later", why: "Before meters are fitted." },
  ];
  if (data.projectType === "existing_property" || data.projectType === "conversion") {
    if (data.utilities.includes("electricity")) list.push({ category: "cut_out", need: "later", why: "Shows us the existing electricity equipment." });
    if (data.utilities.includes("gas")) list.push({ category: "gas_ecv", need: "later", why: "Shows us the existing gas supply." });
  }
  list.push({ category: "other", need: "optional", why: "Drawings, letters or emails from the network." });
  return list;
}

const MAX = 4 * 1024 * 1024;
const OK = /^(image\/(png|jpe?g|webp|heic|heif|gif)|application\/pdf)$/;

export function DocumentsStep({
  data,
  files,
  setFiles,
}: StepProps & { files: PendingFile[]; setFiles: (f: (prev: PendingFile[]) => PendingFile[]) => void }) {
  const errorsRef = useRef<Record<string, string>>({});
  const add = (category: DocumentCategory, list: FileList | null, replaceId?: string) => {
    if (!list?.length) return;
    const accepted: PendingFile[] = [];
    errorsRef.current[category] = "";
    for (const file of Array.from(list)) {
      if (file.size > MAX) errorsRef.current[category] = `“${file.name}” is over 4 MB. Please choose a smaller file.`;
      else if (!OK.test(file.type)) errorsRef.current[category] = `“${file.name}” isn't a photo or PDF.`;
      else accepted.push({ id: crypto.randomUUID(), category, file, url: URL.createObjectURL(file) });
    }
    setFiles((prev) => {
      const kept = replaceId ? prev.filter((p) => p.id !== replaceId) : prev;
      return [...kept, ...accepted];
    });
  };
  return (
    <div className="space-y-4">
      <p className="rounded-2xl bg-lime-100 p-4 text-sm">
        <strong>No rush.</strong> Everything here can be added later from your dashboard. Files are uploaded securely when you submit. Photos (JPG, PNG, HEIC) or PDFs, up to 4&nbsp;MB each.
      </p>
      <ul className="space-y-3">
        {documentChecklist(data).map(({ category, need, why }) => {
          const mine = files.filter((f) => f.category === category);
          const info = DOCUMENT_CATEGORY[category];
          const inputId = `file-${category}`;
          return (
            <li key={category} className="rounded-3xl bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-extrabold">
                    {info.label}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${need === "now" ? "bg-coral-100 text-coral-800" : need === "later" ? "bg-sky-100 text-sky-900" : "bg-navy-900/5"}`}>
                      {need === "now" ? "Needed to apply" : need === "later" ? "Can follow later" : "Optional"}
                    </span>
                    {mine.length > 0 && <span className="rounded-full bg-lime-200 px-2 py-0.5 text-xs font-bold">✓ {mine.length} added</span>}
                  </p>
                  <p className="mt-1 text-sm text-navy-900/65">{info.hint} {why}</p>
                </div>
                <label htmlFor={inputId} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-navy-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-800 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-navy-700">
                  <Upload className="h-4 w-4" aria-hidden="true" /> Add files
                  <input id={inputId} type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => { add(category, e.target.files); e.target.value = ""; }} />
                </label>
              </div>
              {errorsRef.current[category] && <p role="alert" className="mt-2 text-sm font-semibold text-coral-700">{errorsRef.current[category]}</p>}
              {mine.length > 0 && (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {mine.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-cream-100 p-2.5 animate-pop">
                      <a href={f.url} target="_blank" rel="noreferrer" className="block h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white" aria-label={`Preview ${f.file.name}`}>
                        {f.file.type.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center"><FileText className="h-6 w-6" aria-hidden="true" /></span>
                        )}
                      </a>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{f.file.name}</span>
                        <span className="block text-xs text-navy-900/60">{(f.file.size / 1024 / 1024).toFixed(1)} MB</span>
                      </span>
                      <label className="grid h-9 w-9 cursor-pointer place-items-center rounded-full hover:bg-white" title="Replace">
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Replace {f.file.name}</span>
                        <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => { add(category, e.target.files, f.id); e.target.value = ""; }} />
                      </label>
                      <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white" onClick={() => setFiles((prev) => prev.filter((p) => p.id !== f.id))}>
                        <Trash2 className="h-4 w-4 text-coral-700" aria-hidden="true" />
                        <span className="sr-only">Remove {f.file.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="flex items-center gap-2 text-sm text-navy-900/60"><ImageIcon className="h-4 w-4" aria-hidden="true" /> Tip: photos taken on your phone are perfect.</p>
    </div>
  );
}

export function utilityList(us: Utility[]) {
  return us.map((u) => UTILITY_LABEL[u]).join(" and ") || "—";
}
