import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Flame, Zap } from "lucide-react";
import type { Responsibility, Utility } from "@/lib/db/types";
import { RESPONSIBILITY } from "@/lib/domain";

type Variant = "primary" | "secondary" | "ghost" | "dark" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-lime-400 text-navy-900 hover:bg-lime-300 shadow-[0_2px_0_0_var(--color-navy-900)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none",
  secondary: "bg-white text-navy-900 ring-1 ring-navy-900/15 hover:ring-navy-900/40 hover:-translate-y-0.5",
  ghost: "text-navy-800 hover:bg-navy-900/5",
  dark: "bg-navy-900 text-white hover:bg-navy-800 hover:-translate-y-0.5",
  danger: "bg-coral-600 text-white hover:bg-coral-700",
};
const sizes = { sm: "px-3.5 py-2 text-sm", md: "px-5 py-3 text-[15px]", lg: "px-7 py-4 text-base" };

export function buttonClass(variant: Variant = "primary", size: keyof typeof sizes = "md", extra = "") {
  return `inline-flex items-center justify-center gap-2 rounded-full font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

export function Card({ className = "", children, ...rest }: ComponentProps<"div">) {
  return (
    <div {...rest} className={`card ${className}`}>
      {children}
    </div>
  );
}

export function ResponsibilityBadge({ who, className = "" }: { who: Responsibility; className?: string }) {
  const r = RESPONSIBILITY[who];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${r.tone} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {r.label}
    </span>
  );
}

export function Pill({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: "neutral" | "lime" | "coral" | "navy" | "sky" | "green"; className?: string }) {
  const tones = {
    neutral: "bg-navy-900/5 text-navy-800",
    lime: "bg-lime-200 text-navy-900",
    coral: "bg-coral-100 text-coral-800",
    navy: "bg-navy-900 text-white",
    sky: "bg-sky-100 text-sky-900",
    green: "bg-emerald-100 text-emerald-900",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]} ${className}`}>{children}</span>;
}

export function UtilityIcon({ utility, className = "h-4 w-4" }: { utility: Utility; className?: string }) {
  return utility === "electricity" ? <Zap className={className} aria-hidden="true" /> : <Flame className={className} aria-hidden="true" />;
}

export function UtilityChip({ utility }: { utility: Utility }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${utility === "electricity" ? "bg-lime-200 text-navy-900" : "bg-coral-100 text-coral-800"}`}>
      <UtilityIcon utility={utility} className="h-3.5 w-3.5" />
      {utility === "electricity" ? "Electricity" : "Gas"}
    </span>
  );
}

export function ProgressBar({ value, label, className = "" }: { value: number; label: string; className?: string }) {
  return (
    <div className={className}>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-navy-900/10"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-lime-500 to-lime-400 transition-[width] duration-700" style={{ width: `${Math.max(4, value)}%` }} />
      </div>
    </div>
  );
}

export function StageDots({ stage, total = 6, complete = false }: { stage: number; total?: number; complete?: boolean }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const done = complete || n < stage;
        const current = !complete && n === stage;
        return (
          <span
            key={n}
            className={`h-2.5 rounded-full transition-all ${done ? "w-6 bg-lime-500" : current ? "w-6 bg-navy-900 animate-pulse-ring" : "w-2.5 bg-navy-900/15"}`}
          />
        );
      })}
    </div>
  );
}

export function EmptyState({ title, body, action, icon }: { title: string; body: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-navy-900/15 px-6 py-12 text-center">
      {icon}
      <h3 className="mt-3 text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-md text-navy-900/70">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, intro, center = false }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && <p className="text-sm font-bold uppercase tracking-widest text-coral-600">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">{title}</h2>
      {intro && <p className="mt-3 text-lg text-navy-900/70">{intro}</p>}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  optional,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  htmlFor: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-bold text-navy-900">
        {label} {optional && <span className="font-medium text-navy-900/50">(optional)</span>}
      </label>
      {hint && <p id={`${htmlFor}-hint`} className="mt-0.5 text-sm text-navy-900/60">{hint}</p>}
      <div className="mt-1.5">{children}</div>
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-coral-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function DemoBanner({ mode }: { mode: string }) {
  if (mode !== "temporary") return null;
  return (
    <div className="bg-coral-500 px-4 py-1.5 text-center text-xs font-semibold text-white">
      Demo storage is temporary on this deployment — changes may reset. Connect an Upstash Redis store to keep them (see README).
    </div>
  );
}
