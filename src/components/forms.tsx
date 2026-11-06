"use client";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { buttonClass } from "./ui";

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  pendingText = "Saving…",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "dark" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  // Stay disabled until hydrated: a submit queued before React is ready can
  // leave the button stuck in its pending state.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <button type="submit" disabled={pending || !ready} aria-busy={pending} className={buttonClass(variant, size, className)}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

interface State {
  ok?: boolean;
  message?: string;
  error?: string;
}

/** A form bound to a server action, with inline success / error feedback. */
export function ActionForm({
  action,
  children,
  className = "",
  resetOnSuccess = false,
}: {
  action: (state: State, form: FormData) => Promise<State>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, {} as State);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <div aria-live="polite" className="empty:hidden">
        {state.error && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-coral-50 px-3 py-2 text-sm font-semibold text-coral-800" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {state.error}
          </p>
        )}
        {state.ok && state.message && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 animate-rise">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
