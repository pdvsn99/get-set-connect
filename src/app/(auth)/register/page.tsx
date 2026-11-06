"use client";
import Link from "next/link";
import { useActionState } from "react";
import { register, type FormState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/forms";
import { Field } from "@/components/ui";

export default function RegisterPage() {
  const [state, action] = useActionState(register, {} as FormState);
  const fe = state.fieldErrors ?? {};
  const attrs = (k: string) => ({ "aria-invalid": !!fe[k], "aria-describedby": fe[k] ? `${k}-error` : undefined });
  return (
    <>
      <h1 className="text-3xl font-extrabold">Create your account</h1>
      <p className="mt-2 text-navy-900/70">Most people simply <Link href="/apply" className="font-bold underline decoration-lime-500 decoration-2 underline-offset-4">start an application</Link> — we&apos;ll create your account at the end.</p>
      <form action={action} className="mt-8 space-y-5" noValidate>
        <Field label="Your name" htmlFor="name" error={fe.name}>
          <input id="name" name="name" autoComplete="name" className="field-input" {...attrs("name")} />
        </Field>
        <Field label="Company" htmlFor="company" optional hint="If you're a builder or developer.">
          <input id="company" name="company" autoComplete="organization" className="field-input" />
        </Field>
        <Field label="Email address" htmlFor="email" error={fe.email}>
          <input id="email" name="email" type="email" autoComplete="email" className="field-input" {...attrs("email")} />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters." error={fe.password}>
          <input id="password" name="password" type="password" autoComplete="new-password" className="field-input" {...attrs("password")} />
        </Field>
        {state.error && <p role="alert" className="text-sm font-semibold text-coral-700">{state.error}</p>}
        <SubmitButton className="w-full" size="lg" pendingText="Creating account…">Create account</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-navy-900/70">
        Already have an account? <Link href="/sign-in" className="font-bold underline decoration-lime-500 decoration-2 underline-offset-4">Sign in</Link>
      </p>
    </>
  );
}
