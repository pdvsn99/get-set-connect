import Link from "next/link";
import { brand } from "@/lib/brand";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="12" className="fill-navy-900" />
      <path d="M22.5 7 12 22.5h7.2L17.5 33 28 17.5h-7.2L22.5 7Z" className="fill-lime-400" />
    </svg>
  );
}

export function Logo({ dark = false, href = "/" }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5 rounded-lg" aria-label={`${brand.name} home`}>
      <LogoMark className="h-9 w-9 transition-transform group-hover:-rotate-6" />
      <span className={`text-lg font-extrabold tracking-tight ${dark ? "text-white" : "text-navy-900"}`}>
        {brand.name}
      </span>
    </Link>
  );
}

/**
 * "Sparky" — our friendly plug character. Pure SVG so it's crisp everywhere.
 * mood: happy (default) | wave | cheer | think
 */
export function Sparky({
  className = "h-40 w-40",
  mood = "happy",
}: {
  className?: string;
  mood?: "happy" | "wave" | "cheer" | "think";
}) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Sparky, the Get Set Connect plug character">
      {/* cable */}
      <path d="M100 168c0 18 -30 20 -48 14" fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-navy-900" />
      {/* prongs */}
      <rect x="74" y="18" width="12" height="30" rx="5" className="fill-navy-700" />
      <rect x="114" y="18" width="12" height="30" rx="5" className="fill-navy-700" />
      {/* body */}
      <rect x="42" y="42" width="116" height="122" rx="40" className="fill-lime-400" />
      <rect x="42" y="42" width="116" height="122" rx="40" fill="none" strokeWidth="6" className="stroke-navy-900" />
      {/* cheeks */}
      <circle cx="68" cy="116" r="9" className="fill-coral-400" opacity="0.7" />
      <circle cx="132" cy="116" r="9" className="fill-coral-400" opacity="0.7" />
      {/* eyes */}
      {mood === "cheer" ? (
        <>
          <path d="M70 96q8-10 16 0" fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-navy-900" />
          <path d="M114 96q8-10 16 0" fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-navy-900" />
        </>
      ) : (
        <>
          <circle cx="78" cy="94" r="7" className="fill-navy-900" />
          <circle cx="122" cy="94" r="7" className="fill-navy-900" />
          <circle cx="80" cy="92" r="2" fill="#fff" />
          <circle cx="124" cy="92" r="2" fill="#fff" />
        </>
      )}
      {/* mouth */}
      {mood === "think" ? (
        <path d="M88 128h24" strokeWidth="6" strokeLinecap="round" className="stroke-navy-900" />
      ) : (
        <path d="M84 122q16 18 32 0" fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-navy-900" />
      )}
      {/* arms */}
      {mood === "wave" || mood === "cheer" ? (
        <path d="M156 100q22-10 22-36" fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-navy-900" />
      ) : (
        <path d="M156 110q16 6 20 22" fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-navy-900" />
      )}
      {mood === "cheer" ? (
        <path d="M44 100q-22-10 -22-36" fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-navy-900" />
      ) : (
        <path d="M44 110q-16 6 -20 22" fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-navy-900" />
      )}
      {/* spark */}
      {(mood === "cheer" || mood === "wave") && (
        <path d="M176 30l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" className="fill-coral-500" />
      )}
      {mood === "think" && <text x="160" y="50" fontSize="34" fontWeight="800" className="fill-navy-900">?</text>}
    </svg>
  );
}
