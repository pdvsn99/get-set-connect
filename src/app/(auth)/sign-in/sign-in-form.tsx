"use client";
import { useActionState, useState } from "react";
import { AlertCircle, UserRound } from "lucide-react";
import { signIn, type FormState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/forms";
import { Field } from "@/components/ui";

export function SignInForm({
  next,
  accounts,
  preset,
}: {
  next?: string;
  accounts: { email: string; password: string; label: string }[];
  preset?: string;
}) {
  const [state, action] = useActionState(signIn, {} as FormState);
  const initial = accounts.find((a) => a.email === preset);
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");

  return (
    <>
      <form action={action} className="mt-8 space-y-5" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email address" htmlFor="email">
          <input id="email" name="email" type="email" autoComplete="email" required className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" name="password" type="password" autoComplete="current-password" required className="field-input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {state.error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-coral-50 px-3 py-2 text-sm font-semibold text-coral-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {state.error}
          </p>
        )}
        <SubmitButton className="w-full" size="lg" pendingText="Signing in…">Sign in</SubmitButton>
      </form>

      <div className="mt-8 rounded-3xl bg-lime-100 p-5 ring-1 ring-lime-300">
        <h2 className="text-sm font-extrabold">Demo accounts</h2>
        <p className="mt-0.5 text-sm text-navy-900/70">Tap one to fill in the details, then sign in.</p>
        <ul className="mt-3 space-y-2">
          {accounts.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.password);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-2.5 text-left text-sm transition hover:ring-2 hover:ring-navy-900/20 ${email === a.email ? "ring-2 ring-navy-900" : ""}`}
              >
                <UserRound className="h-5 w-5 shrink-0 text-navy-700" aria-hidden="true" />
                <span>
                  <span className="block font-bold">{a.label}</span>
                  <span className="block text-navy-900/60">{a.email} · {a.password}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
