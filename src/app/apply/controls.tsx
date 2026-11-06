"use client";
import type { ReactNode } from "react";
import { Check } from "lucide-react";

/** Large illustrated selectable card (radio or checkbox semantics). */
export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  type = "radio",
  title,
  body,
  icon,
  tone = "bg-lime-300",
  disabled,
  badge,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  type?: "radio" | "checkbox";
  title: string;
  body?: string;
  icon?: ReactNode;
  tone?: string;
  disabled?: boolean;
  badge?: ReactNode;
}) {
  return (
    <label
      className={`group relative flex cursor-pointer flex-col rounded-3xl bg-white p-5 shadow-card ring-2 transition duration-200 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy-700 ${
        checked ? "ring-navy-900 -translate-y-0.5 shadow-lift" : "ring-transparent hover:-translate-y-0.5 hover:ring-navy-900/20"
      } ${disabled ? "cursor-not-allowed opacity-60 hover:translate-y-0" : ""}`}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className="flex items-start justify-between gap-3">
        {icon && (
          <span className={`grid h-14 w-14 place-items-center rounded-2xl ${tone} text-navy-900 transition group-hover:rotate-[-4deg]`}>{icon}</span>
        )}
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition ${
            checked ? "border-navy-900 bg-navy-900 text-lime-400 animate-pop" : "border-navy-900/20 bg-white text-transparent"
          }`}
          aria-hidden="true"
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      </span>
      <span className="mt-4 flex flex-wrap items-center gap-2 text-lg font-extrabold">{title} {badge}</span>
      {body && <span className="mt-1 text-[15px] text-navy-900/65">{body}</span>}
    </label>
  );
}

/** Compact pill radio group for simple options. */
export function RadioPills<T extends string>({
  name,
  legend,
  hint,
  options,
  value,
  onChange,
  error,
  columns = false,
}: {
  name: string;
  legend: ReactNode;
  hint?: ReactNode;
  options: { value: T; label: string; hint?: string }[];
  value?: T;
  onChange: (v: T) => void;
  error?: string;
  columns?: boolean;
}) {
  return (
    <fieldset aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="text-base font-bold">{legend}</legend>
      {hint && <p className="mt-0.5 text-sm text-navy-900/60">{hint}</p>}
      <div className={`mt-3 ${columns ? "grid gap-2 sm:grid-cols-2" : "flex flex-wrap gap-2"}`}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={`flex cursor-pointer items-center gap-2.5 rounded-2xl px-4 py-3 text-[15px] font-semibold ring-2 transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy-700 ${
                checked ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-navy-900/10 hover:ring-navy-900/30"
              }`}
            >
              <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${checked ? "border-lime-400 bg-lime-400" : "border-navy-900/25"}`} aria-hidden="true">
                {checked && <span className="h-2 w-2 rounded-full bg-navy-900" />}
              </span>
              <span>
                {o.label}
                {o.hint && <span className={`block text-xs font-medium ${checked ? "text-white/70" : "text-navy-900/55"}`}>{o.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${name}-error`} role="alert" className="mt-2 text-sm font-semibold text-coral-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function Explainer({ title = "What does this mean?", children }: { title?: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl bg-lime-100 px-4 py-3 text-sm">
      <summary className="cursor-pointer list-none font-bold">
        <span aria-hidden="true" className="mr-1.5 inline-block transition group-open:rotate-90">›</span>
        {title}
      </summary>
      <div className="mt-2 text-navy-900/80">{children}</div>
    </details>
  );
}
