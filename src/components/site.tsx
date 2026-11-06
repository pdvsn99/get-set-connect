import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { brand } from "@/lib/brand";
import { Logo } from "./brand";
import { LinkButton } from "./ui";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const home = user?.role === "admin" ? "/admin" : "/portal";
  return (
    <header className="sticky top-0 z-40 border-b border-navy-900/5 bg-cream-100/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 text-[15px] font-semibold md:flex">
          <Link href="/#how-it-works" className="rounded-full px-3 py-2 hover:bg-navy-900/5">How it works</Link>
          <Link href="/#services" className="rounded-full px-3 py-2 hover:bg-navy-900/5">Services</Link>
          <Link href="/#why-free" className="rounded-full px-3 py-2 hover:bg-navy-900/5">Why it&apos;s free</Link>
          <Link href="/#faqs" className="rounded-full px-3 py-2 hover:bg-navy-900/5">FAQs</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <LinkButton href={home} variant="secondary" size="sm">
              {user.role === "admin" ? "Operations" : "My Connections"}
            </LinkButton>
          ) : (
            <Link href="/sign-in" className="rounded-full px-3 py-2 text-sm font-bold hover:bg-navy-900/5">Sign in</Link>
          )}
          <LinkButton href="/apply" size="sm" className="hidden sm:inline-flex">Get started</LinkButton>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="on-dark bg-navy-950 text-white/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo dark />
          <p className="mt-4 max-w-sm text-white/60">{brand.tagline} We coordinate new utility connections so you don&apos;t have to chase five different organisations.</p>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-lime-400">Get going</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/apply">Start an application</Link></li>
            <li><Link className="hover:text-white" href="/sign-in">My Connections</Link></li>
            <li><Link className="hover:text-white" href="/#faqs">FAQs</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-lime-400">Say hello</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>{brand.supportEmail}</li>
            <li>{brand.domain}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-white/50 sm:px-6">
          {brand.name} is an independent connections coordinator. We are not a distribution network operator (DNO), gas distribution network (GDN) or energy supplier. Our coordination service is free; network connection charges, works and other third-party services may carry charges payable by you, and we&apos;ll always tell you before anything is agreed. We may receive disclosed referral fees from participating suppliers. This is a proof-of-concept demonstration using fictional data.
        </p>
      </div>
    </footer>
  );
}
