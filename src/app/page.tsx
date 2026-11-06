import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Droplets,
  Flame,
  Hammer,
  Home,
  HousePlus,
  MessageCircleHeart,
  PoundSterling,
  ShieldCheck,
  Sparkles,
  Wifi,
  Zap,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site";
import { Sparky } from "@/components/brand";
import { LinkButton, Pill, ResponsibilityBadge, SectionTitle, StageDots } from "@/components/ui";

const steps = [
  {
    icon: ClipboardList,
    title: "Tell us about your place",
    body: "A few friendly questions — about five minutes. Not sure about something? No worries, just say so.",
  },
  {
    icon: Sparkles,
    title: "Leave the complicated bits to us",
    body: "We deal with the network companies, quotes, works dates, meter numbers and suppliers on your behalf.",
  },
  {
    icon: Bell,
    title: "Track it like a delivery",
    body: "See exactly what's happening, what's next and whether you need to do anything — any time, on any device.",
  },
];

const audiences = [
  { icon: Home, title: "Homeowners & self-builders", body: "Building your own home? We'll guide you from the first application to the meter going on the wall." },
  { icon: Hammer, title: "Builders", body: "Keep your build programme on track without spending hours on hold to the network." },
  { icon: Building2, title: "Property developers", body: "Manage 2 to 50 plots in one place, with plot-by-plot status, MPANs, MPRNs and CSV exports." },
  { icon: HousePlus, title: "Conversions", body: "Turning one building into several homes? We'll sort new supplies for every unit." },
];

const faqs = [
  {
    q: "How long does a new connection take?",
    a: "It depends on the network and how much work is needed. A simple single home might take 8–12 weeks from application to meter; larger sites can take longer. We'll only ever show you dates the network or supplier has actually confirmed — never guesses.",
  },
  {
    q: "What does it cost?",
    a: "Our coordination service is free. The network company will usually charge for the physical connection (they'll send a quote, and nothing goes ahead without your OK). Meter installation is normally arranged through your energy supplier.",
  },
  {
    q: "What do I need to get started?",
    a: "Just the address or a description of the site, a postcode, and roughly what you're building. Plans and photos help, but you can add them later. You don't need any reference numbers.",
  },
  {
    q: "What's an MPAN or MPRN?",
    a: "They're the unique numbers for your electricity (MPAN) and gas (MPRN) supply points — think of them as a postcode for your meter. We'll get them allocated for you.",
  },
  {
    q: "What's a DNO or GDN?",
    a: "The DNO (distribution network operator) owns the electricity cables in your area, and the GDN (gas distribution network) owns the gas pipes. They're not your energy supplier — they build the connection. We talk to them so you don't have to.",
  },
  {
    q: "Are you an energy supplier?",
    a: "No. We're an independent coordinator. We help you choose a supplier based on what suits you, and we're always upfront about any referral arrangements.",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-lime-300/50 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute top-40 -left-32 h-80 w-80 rounded-full bg-coral-200/50 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
            <div className="animate-rise">
              <Pill tone="navy" className="mb-5">
                <Zap className="h-3.5 w-3.5 text-lime-400" aria-hidden="true" /> Ready. Set. Connected.
              </Pill>
              <h1 className="text-[2.6rem] leading-[1.05] font-extrabold sm:text-6xl">
                New property?{" "}
                <span className="relative whitespace-nowrap">
                  <span className="relative z-10">Let&apos;s get you</span>
                  <span className="absolute inset-x-0 bottom-1 -z-0 h-4 rounded-full bg-lime-400/80 sm:bottom-2" aria-hidden="true" />
                </span>{" "}
                connected.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-navy-900/75 sm:text-xl">
                Electricity, gas and all the complicated bits in between. We help get your property connected, from the first application to the final meter installation.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/apply" size="lg">
                  Get started — it&apos;s free <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </LinkButton>
                <LinkButton href="#how-it-works" variant="secondary" size="lg">How it works</LinkButton>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-navy-900/70">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-lime-600" aria-hidden="true" /> Free coordination</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-lime-600" aria-hidden="true" /> No jargon</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-lime-600" aria-hidden="true" /> 1 to 50 properties</li>
              </ul>
            </div>

            {/* Floating portal preview */}
            <div className="relative mx-auto mb-16 w-full max-w-md animate-rise [animation-delay:150ms]">
              <Sparky className="absolute -bottom-28 -left-6 z-10 h-28 w-28 animate-float sm:-left-16 sm:h-32 sm:w-32" mood="wave" />
              <div className="card relative rotate-1 p-6 shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-navy-900/50">My Connections</p>
                    <h2 className="mt-1 text-xl font-extrabold">The Orchard — 6 new homes</h2>
                  </div>
                  <Pill tone="lime">Stage 3 of 6</Pill>
                </div>
                <p className="mt-3 text-[15px] font-semibold">Things are moving! Your electricity network works are being arranged.</p>
                <div className="mt-4"><StageDots stage={3} /></div>
                <div className="mt-5 space-y-2.5">
                  <div className="flex items-center justify-between rounded-2xl bg-cream-100 px-4 py-3">
                    <span className="flex items-center gap-2 font-bold"><Zap className="h-4 w-4" aria-hidden="true" /> Electricity</span>
                    <ResponsibilityBadge who="network" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-cream-100 px-4 py-3">
                    <span className="flex items-center gap-2 font-bold"><Flame className="h-4 w-4" aria-hidden="true" /> Gas</span>
                    <ResponsibilityBadge who="us" />
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-coral-50 p-4 ring-1 ring-coral-200">
                  <p className="text-sm font-bold text-coral-800">Over to you</p>
                  <p className="text-sm text-coral-800/90">Upload meter cabinet photos for plots 2 and 4.</p>
                </div>
              </div>
              <div className="card absolute -right-3 -bottom-20 hidden w-60 -rotate-2 p-4 sm:block">
                <p className="flex items-center gap-2 text-sm font-bold"><Bell className="h-4 w-4 text-coral-500" aria-hidden="true" /> Just now</p>
                <p className="mt-1 text-sm text-navy-900/75">Your gas connection date has been confirmed.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionTitle center eyebrow="How it works" title="Three steps. Zero chasing." intro="Getting connected usually means juggling network companies, suppliers and meter installers. We become your single point of contact." />
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="relative rounded-3xl bg-cream-100 p-7">
                  <span className="absolute top-6 right-6 text-5xl font-extrabold text-navy-900/10" aria-hidden="true">{i + 1}</span>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-900 text-lime-400">
                    <s.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-xl font-extrabold">{s.title}</h3>
                  <p className="mt-2 text-navy-900/70">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionTitle eyebrow="Services" title="Everything your property needs to switch on." />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Zap, name: "Electricity", body: "Network application, quotation, works, MPAN and meter.", live: true, tone: "bg-lime-400" },
                { icon: Flame, name: "Gas", body: "Network application, service pipe, MPRN and meter.", live: true, tone: "bg-coral-400" },
                { icon: Droplets, name: "Water", body: "New water and sewerage connections.", live: false, tone: "bg-sky-200" },
                { icon: Wifi, name: "Broadband", body: "Fibre to your new front door.", live: false, tone: "bg-violet-200" },
              ].map((s) => (
                <div key={s.name} className={`card p-6 transition hover:-translate-y-1 hover:shadow-lift ${s.live ? "" : "opacity-80"}`}>
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${s.tone} text-navy-900`}>
                    <s.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="mt-5 flex items-center gap-2">
                    <h3 className="text-xl font-extrabold">{s.name}</h3>
                    {!s.live && <Pill>Coming soon</Pill>}
                  </div>
                  <p className="mt-2 text-navy-900/70">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionTitle eyebrow="Who it's for" title="One home or fifty, we've got you." />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {audiences.map((a) => (
                <div key={a.title} className="rounded-3xl bg-cream-100 p-6">
                  <a.icon className="h-8 w-8 text-coral-500" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-extrabold">{a.title}</h3>
                  <p className="mt-2 text-navy-900/70">{a.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Portal demo */}
        <section className="on-dark relative overflow-hidden bg-navy-900 py-20 text-white">
          <div className="pointer-events-none absolute -right-20 -bottom-40 h-96 w-96 rounded-full bg-lime-400/20 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-lime-400">Your customer portal</p>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Always know what&apos;s happening.</h2>
              <p className="mt-4 text-lg text-white/70">Your dashboard answers three questions, every time you look:</p>
              <ul className="mt-6 space-y-4">
                {["What's happening with my connection?", "What happens next?", "Do I need to do anything?"].map((q, i) => (
                  <li key={q} className="flex items-center gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lime-400 font-extrabold text-navy-900">{i + 1}</span>
                    <span className="text-lg font-bold">{q}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/sign-in?demo=priya">Try the demo portal <ArrowRight className="h-4 w-4" aria-hidden="true" /></LinkButton>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-6 text-navy-900 shadow-lift">
              <p className="text-xs font-bold uppercase tracking-widest text-navy-900/50">Electricity · Willow Cottage</p>
              <ol className="mt-4 space-y-1">
                {[
                  ["Application received", "done"],
                  ["Network applications and quotations", "done"],
                  ["Network works arranged", "now"],
                  ["Connection works completed", "todo"],
                  ["Supplier and meter installation arranged", "todo"],
                  ["Connected and complete", "todo"],
                ].map(([t, s]) => (
                  <li key={t} className="flex items-center gap-3 rounded-xl px-2 py-2">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${s === "done" ? "bg-lime-400" : s === "now" ? "bg-navy-900 text-white animate-pulse-ring" : "bg-navy-900/10 text-navy-900/40"}`}>
                      {s === "done" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : "•"}
                    </span>
                    <span className={`font-semibold ${s === "todo" ? "text-navy-900/50" : ""}`}>{t}</span>
                    {s === "now" && <ResponsibilityBadge who="network" className="ml-auto hidden sm:inline-flex" />}
                  </li>
                ))}
              </ol>
              <p className="mt-4 rounded-2xl bg-cream-100 p-4 text-sm"><strong>Next date:</strong> awaiting confirmation from the network. We won&apos;t guess — we&apos;ll tell you as soon as it&apos;s confirmed.</p>
            </div>
          </div>
        </section>

        {/* Why free */}
        <section id="why-free" className="scroll-mt-20 py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="flex justify-center"><Sparky className="h-56 w-56" mood="cheer" /></div>
            <div>
              <SectionTitle eyebrow="Why it's free" title="Free to you. Honest about how." />
              <div className="mt-6 space-y-4 text-lg text-navy-900/75">
                <p>Our coordination service doesn&apos;t cost you a penny. We earn money through disclosed referral arrangements with participating energy suppliers when you choose to set up an account with them.</p>
                <p>We recommend suppliers based on what suits you — fuel, availability, lead times and your needs. <strong className="text-navy-900">Never on who pays us the most.</strong></p>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="flex gap-3 rounded-2xl bg-white p-4 shadow-card">
                  <PoundSterling className="h-6 w-6 shrink-0 text-lime-600" aria-hidden="true" />
                  <p className="text-sm"><strong>What may cost money:</strong> network connection works, and other third-party services. You&apos;ll always see the quote first.</p>
                </div>
                <div className="flex gap-3 rounded-2xl bg-white p-4 shadow-card">
                  <ShieldCheck className="h-6 w-6 shrink-0 text-lime-600" aria-hidden="true" />
                  <p className="text-sm"><strong>Independent:</strong> we&apos;re not a network operator or an energy supplier. We work for you.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section id="faqs" className="scroll-mt-20 bg-white py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <SectionTitle center eyebrow="FAQs" title="Good questions." />
            <div className="mt-10 space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-2xl bg-cream-100 p-5 open:bg-lime-100">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg text-lg font-bold">
                    {f.q}
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-xl transition group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-3 text-navy-900/75">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-[2rem] bg-lime-400 px-6 py-14 text-center sm:px-12">
              <MessageCircleHeart className="mx-auto h-10 w-10" aria-hidden="true" />
              <h2 className="mt-4 text-3xl font-extrabold sm:text-5xl">Ready? Set? Let&apos;s get connected.</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-navy-900/80">It takes about five minutes, and you can save and come back any time.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <LinkButton href="/apply" variant="dark" size="lg">Get started — it&apos;s free</LinkButton>
                <LinkButton href="/sign-in" variant="secondary" size="lg">Sign in to My Connections</LinkButton>
              </div>
              <p className="mx-auto mt-8 max-w-2xl text-xs text-navy-900/70">Network connection charges and other third-party costs may apply. We&apos;ll always share quotes with you before anything goes ahead.</p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

export const dynamic = "force-dynamic";
