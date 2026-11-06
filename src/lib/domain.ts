// Shared, framework-free domain helpers: labels, explanations and the logic
// that turns raw milestone data into the friendly answers customers see.
import type {
  Connection,
  DocumentCategory,
  Milestone,
  MilestoneKey,
  ProjectStatus,
  ProjectType,
  Responsibility,
  StartingPoint,
  Utility,
} from "./db/types";

export const MILESTONES: {
  key: MilestoneKey;
  title: string;
  explainer: string;
}[] = [
  {
    key: "received",
    title: "Application received",
    explainer:
      "We've got your details and checked we have everything we need to get started.",
  },
  {
    key: "network_application",
    title: "Network applications and quotations",
    explainer:
      "We apply to the local network company — the people who own the cables and pipes in your area — and get a quote for connecting your property.",
  },
  {
    key: "works_arranged",
    title: "Network works arranged",
    explainer:
      "Once the quote is accepted, the network company schedules the work to run a new supply to your property.",
  },
  {
    key: "works_completed",
    title: "Connection works completed",
    explainer:
      "The new cable or pipe has been laid and connected up to your property, ready for a meter.",
  },
  {
    key: "meter_arranged",
    title: "Supplier and meter installation arranged",
    explainer:
      "We help you choose an energy supplier and book them in to fit your meter.",
  },
  {
    key: "connected",
    title: "Connected and complete",
    explainer: "Your meter is fitted and your supply is live. Happy days!",
  },
];

export const RESPONSIBILITY: Record<
  Responsibility,
  { label: string; tone: string }
> = {
  us: { label: "We're on it", tone: "bg-lime-200 text-navy-900" },
  network: { label: "Waiting on the network", tone: "bg-sky-100 text-sky-900" },
  supplier: {
    label: "Waiting on the supplier",
    tone: "bg-violet-100 text-violet-900",
  },
  customer: { label: "Over to you", tone: "bg-coral-100 text-coral-800" },
  completed: { label: "Completed", tone: "bg-emerald-100 text-emerald-900" },
};

export const UTILITY_LABEL: Record<Utility, string> = {
  electricity: "Electricity",
  gas: "Gas",
};

export const METER_NUMBER: Record<
  Utility,
  { short: string; long: string; explain: string }
> = {
  electricity: {
    short: "MPAN",
    long: "Meter Point Administration Number",
    explain:
      "Your MPAN is a 13-digit number that identifies your electricity supply point. It's like a postcode for your meter. We'll get one allocated for you — you don't need it to start.",
  },
  gas: {
    short: "MPRN",
    long: "Meter Point Reference Number",
    explain:
      "Your MPRN is a 6–10 digit number that identifies your gas supply point. We'll get one allocated for you — you don't need it to start.",
  },
};

export const NETWORK_EXPLAINER: Record<Utility, string> = {
  electricity:
    "A DNO (distribution network operator) owns the electricity cables in your area. They're not your energy supplier — they build and look after the network.",
  gas: "A GDN (gas distribution network) owns the gas pipes in your area. They lay the pipe to your property; your supplier then fits the meter.",
};

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  new_home: "A brand-new home",
  multiple_homes: "Multiple new homes",
  conversion: "A property conversion",
  existing_property: "An existing property needing a new supply",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  submitted: "New request",
  in_progress: "In progress",
  awaiting_customer: "Waiting on customer",
  completed: "Completed",
  withdrawn: "Withdrawn",
};

export const STARTING_POINT_LABEL: Record<StartingPoint, string> = {
  scratch: "No, I'm starting from scratch",
  applied: "I've submitted an application",
  quoted: "I've received a quotation",
  works_underway: "My network works are underway",
  ready_for_meters: "My connection is ready for meters",
  not_sure: "I'm not sure",
};

export const DOCUMENT_CATEGORY: Record<
  DocumentCategory,
  { label: string; hint: string; utility?: Utility }
> = {
  site_plan: {
    label: "Site plan",
    hint: "A drawing showing the property and where services will run.",
  },
  location_plan: {
    label: "Location plan",
    hint: "A map showing where the site is, usually at 1:1250 or 1:2500 scale.",
  },
  meter_position: {
    label: "Meter position photos",
    hint: "Photos of where you'd like the meters to go.",
  },
  meter_cabinet: {
    label: "Meter cabinet photos",
    hint: "Photos of the installed meter box or cabinet, with the door open.",
  },
  cut_out: {
    label: "Electricity service head / cut-out photos",
    hint: "The black or grey box where the network cable enters the property.",
    utility: "electricity",
  },
  gas_ecv: {
    label: "Gas service pipe or ECV photos",
    hint: "The ECV is the emergency control valve — the yellow-handled lever where gas enters.",
    utility: "gas",
  },
  other: { label: "Other supporting documents", hint: "Anything else useful." },
};

/** Build the initial milestones based on where the customer says they are. */
export function initialMilestones(
  start: StartingPoint | undefined,
  now: string,
): Milestone[] {
  const done = (k: MilestoneKey): Milestone => ({
    key: k,
    state: "complete",
    responsible: "completed",
    updatedAt: now,
  });
  const todo = (k: MilestoneKey): Milestone => ({
    key: k,
    state: "not_started",
    responsible: "us",
    updatedAt: now,
  });
  const order = MILESTONES.map((m) => m.key);
  // How many milestones the customer has already passed (we'll verify).
  const passed: Record<StartingPoint, number> = {
    scratch: 1,
    not_sure: 1,
    applied: 1,
    quoted: 1,
    works_underway: 2,
    ready_for_meters: 4,
  };
  const n = passed[start ?? "scratch"];
  return order.map((k, i) => {
    if (i < n) return done(k);
    if (i === n)
      return {
        key: k,
        state: "in_progress",
        responsible: "us",
        note: "We're checking the details and will confirm the next step shortly.",
        updatedAt: now,
      };
    return todo(k);
  });
}

/** 1-based stage the connection is currently at (6 = complete). */
export function currentStage(c: Pick<Connection, "milestones">): number {
  const idx = c.milestones.findIndex((m) => m.state !== "complete");
  return idx === -1 ? MILESTONES.length : idx + 1;
}

export function isComplete(c: Pick<Connection, "milestones">): boolean {
  return c.milestones.every((m) => m.state === "complete");
}

export function currentMilestone(c: Pick<Connection, "milestones">): Milestone {
  return (
    c.milestones.find((m) => m.state !== "complete") ??
    c.milestones[c.milestones.length - 1]
  );
}

export function milestoneTitle(key: MilestoneKey): string {
  return MILESTONES.find((m) => m.key === key)?.title ?? key;
}

/** Progress as a 0-100 number across a set of connections. */
export function progressPercent(conns: Pick<Connection, "milestones">[]): number {
  if (conns.length === 0) return 0;
  const total = conns.length * MILESTONES.length;
  const done = conns.reduce(
    (s, c) => s + c.milestones.filter((m) => m.state === "complete").length,
    0,
  );
  return Math.round((done / total) * 100);
}

/** The lowest stage across connections — the honest "where are we" number. */
export function overallStage(conns: Pick<Connection, "milestones">[]): number {
  if (conns.length === 0) return 1;
  return Math.min(...conns.map(currentStage));
}

const HEADLINES: Record<MilestoneKey, Record<Responsibility, string>> = {
  received: {
    us: "We're reviewing your request.",
    network: "We're reviewing your request.",
    supplier: "We're reviewing your request.",
    customer: "We need a little more from you to get started.",
    completed: "Application received.",
  },
  network_application: {
    us: "We're preparing your network application.",
    network: "Your application is with the network — we're waiting on their quote.",
    supplier: "We're preparing your network application.",
    customer: "Your network quote is ready for you to review.",
    completed: "Network quote sorted.",
  },
  works_arranged: {
    us: "Things are moving! Your network works are being arranged.",
    network: "The network is scheduling your connection works.",
    supplier: "Your network works are being arranged.",
    customer: "We need something from you before works can be booked.",
    completed: "Network works arranged.",
  },
  works_completed: {
    us: "We're checking the connection works are finished.",
    network: "The network is carrying out your connection works.",
    supplier: "Connection works are underway.",
    customer: "Over to you — the site needs to be ready for the network.",
    completed: "Connection works completed.",
  },
  meter_arranged: {
    us: "Nearly there! We're arranging your supplier and meter.",
    network: "Nearly there! We're arranging your meter.",
    supplier: "Nearly there! Waiting on the supplier to book your meter.",
    customer: "Over to you — we need one more thing before your meter is fitted.",
    completed: "Meter installation arranged.",
  },
  connected: {
    us: "Final checks before we call it done.",
    network: "Final checks before we call it done.",
    supplier: "Final checks with your supplier.",
    customer: "Final checks — we need a quick confirmation from you.",
    completed: "All connected. Happy days!",
  },
};

export function connectionHeadline(c: Pick<Connection, "milestones">): string {
  if (isComplete(c)) return "All connected. Happy days!";
  const m = currentMilestone(c);
  return HEADLINES[m.key][m.responsible];
}

export function formatDate(iso?: string, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
    ...opts,
  });
}

export function formatDateTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return formatDate(iso);
}

export function formatPounds(pence?: number) {
  if (pence === undefined) return "";
  return (pence / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
}

export function ageInDays(iso: string, now = Date.now()) {
  return Math.floor((now - new Date(iso).getTime()) / 86_400_000);
}
