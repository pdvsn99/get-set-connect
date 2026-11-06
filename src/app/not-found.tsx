import { Sparky } from "@/components/brand";
import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <Sparky className="mx-auto h-40 w-40" mood="think" />
        <h1 className="mt-4 text-3xl font-extrabold">We couldn&apos;t find that</h1>
        <p className="mt-2 text-navy-900/70">It may have moved, or you might not have access to it.</p>
        <LinkButton href="/" className="mt-6">Back to home</LinkButton>
      </div>
    </main>
  );
}
