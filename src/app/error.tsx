"use client";
import { Sparky } from "@/components/brand";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="grid min-h-[70dvh] place-items-center px-4 text-center">
      <div>
        <Sparky className="mx-auto h-36 w-36" mood="think" />
        <h1 className="mt-4 text-2xl font-extrabold">Something went wrong</h1>
        <p className="mt-2 text-navy-900/70">Sorry about that. Please try again.</p>
        <button onClick={reset} className="mt-6 rounded-full bg-lime-400 px-5 py-3 font-bold">Try again</button>
      </div>
    </main>
  );
}
