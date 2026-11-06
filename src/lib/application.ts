// Shape and validation of the connection application wizard.
// Shared by the browser (step-by-step checks) and the server (final check).
import type {
  FutureUtility,
  ProjectType,
  Requirements,
  StartingPoint,
  Utility,
} from "./db/types";
import { normalisePostcode, validateMpan, validateMprn } from "./integrations/validation";

export interface ApplicationData {
  projectType?: ProjectType;
  property: {
    name: string;
    addressLine: string;
    town: string;
    postcode: string;
    noAddress: boolean;
    siteDescription: string;
    plotCount: number;
    plots: { name: string; address: string }[];
    contactIsMe: boolean;
    siteContact: { name: string; phone: string; email: string };
  };
  utilities: Utility[];
  interestedIn: FutureUtility[];
  progress: {
    electricity?: StartingPoint;
    gas?: StartingPoint;
    electricityRef: string;
    gasRef: string;
    mpan: string;
    mprn: string;
  };
  requirements: Requirements;
  contact: {
    name: string;
    email: string;
    phone: string;
    company: string;
    password: string;
    consent: boolean;
  };
}

export const emptyApplication = (): ApplicationData => ({
  property: {
    name: "",
    addressLine: "",
    town: "",
    postcode: "",
    noAddress: false,
    siteDescription: "",
    plotCount: 1,
    plots: [],
    contactIsMe: true,
    siteContact: { name: "", phone: "", email: "" },
  },
  utilities: [],
  interestedIn: [],
  progress: { electricityRef: "", gasRef: "", mpan: "", mprn: "" },
  requirements: { electricity: {}, gas: {} },
  contact: { name: "", email: "", phone: "", company: "", password: "", consent: false },
});

export const STEPS = [
  { key: "type", title: "What are we connecting?" },
  { key: "property", title: "Where is the property?" },
  { key: "utilities", title: "What do you need?" },
  { key: "progress", title: "How far along are you?" },
  { key: "requirements", title: "Your requirements" },
  { key: "documents", title: "Documents" },
  { key: "review", title: "Review and submit" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

export const isMulti = (d: ApplicationData) =>
  d.projectType === "multiple_homes" || d.projectType === "conversion";

export function plotNames(d: ApplicationData) {
  const count = isMulti(d) ? Math.max(1, d.property.plotCount) : 1;
  const base = d.property.name.trim() || "Plot";
  return Array.from({ length: count }, (_, i) => ({
    name:
      d.property.plots[i]?.name?.trim() ||
      (count === 1 ? base : `${d.projectType === "conversion" ? "Unit" : "Plot"} ${i + 1} — ${base}`),
    address: d.property.plots[i]?.address?.trim() ?? "",
  }));
}

export type Errors = Record<string, string>;

export function validateStep(step: StepKey, d: ApplicationData, opts: { signedIn: boolean }): Errors {
  const e: Errors = {};
  switch (step) {
    case "type":
      if (!d.projectType) e.projectType = "Pick the option that fits best — you can change it later.";
      break;
    case "property": {
      const p = d.property;
      if (!p.name.trim()) e.name = isMulti(d) ? "Give your development a name — even a working title is fine." : "Give the property a name, like ‘Willow Cottage’ or ‘12 High Street’.";
      if (!normalisePostcode(p.postcode)) e.postcode = "Please enter a full UK postcode, like SW1A 1AA.";
      if (p.noAddress) {
        if (p.siteDescription.trim().length < 5) e.siteDescription = "Describe where the site is so the network can find it.";
      } else if (!p.addressLine.trim()) {
        e.addressLine = "Please enter the first line of the address — or tick ‘no address yet’.";
      }
      if (isMulti(d) && (p.plotCount < 2 || p.plotCount > 50)) e.plotCount = "Enter between 2 and 50 properties.";
      if (!p.contactIsMe && !p.siteContact.name.trim()) e.siteContactName = "Who should we speak to on site?";
      break;
    }
    case "utilities":
      if (d.utilities.length === 0) e.utilities = "Choose electricity, gas or both.";
      break;
    case "progress":
      for (const u of d.utilities) if (!d.progress[u]) e[u] = "Choose an option — ‘I'm not sure’ is absolutely fine.";
      if (d.progress.mpan.trim()) {
        const r = validateMpan(d.progress.mpan);
        if (!r.ok) e.mpan = r.message!;
      }
      if (d.progress.mprn.trim()) {
        const r = validateMprn(d.progress.mprn);
        if (!r.ok) e.mprn = r.message!;
      }
      break;
    case "requirements":
      if (d.requirements.desiredCompletionDate) {
        const t = new Date(d.requirements.desiredCompletionDate).getTime();
        if (Number.isNaN(t) || t < Date.now() - 86_400_000) e.desiredCompletionDate = "Please choose a date in the future.";
      }
      break;
    case "documents":
      break;
    case "review": {
      const c = d.contact;
      if (c.name.trim().length < 2) e.contactName = "Please tell us your name.";
      if (!opts.signedIn) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) e.contactEmail = "Please enter a valid email address.";
        if (c.password.length < 8) e.contactPassword = "Choose a password of at least 8 characters.";
      }
      if (c.phone && !/^[\d\s+()-]{10,}$/.test(c.phone)) e.contactPhone = "That phone number doesn't look right.";
      if (!c.consent) e.consent = "We need your permission before we can act on your behalf.";
      break;
    }
  }
  return e;
}

export function validateAll(d: ApplicationData, opts: { signedIn: boolean }): Errors {
  return STEPS.reduce<Errors>((acc, s) => ({ ...acc, ...validateStep(s.key, d, opts) }), {});
}

// Indicative network areas by postcode area. Staff always confirm the actual
// network operator; this simply gives the case a sensible starting point.
const AREA_NETWORKS: Record<string, { electricity?: string; gas?: string }> = {
  // London / South East / East
  E: { electricity: "net_ukpn", gas: "net_cadent" }, N: { electricity: "net_ukpn", gas: "net_cadent" },
  SE: { electricity: "net_ukpn", gas: "net_sgn" }, SW: { electricity: "net_ukpn", gas: "net_sgn" },
  CM: { electricity: "net_ukpn", gas: "net_cadent" }, CB: { electricity: "net_ukpn", gas: "net_cadent" },
  MK: { electricity: "net_ukpn", gas: "net_cadent" }, ME: { electricity: "net_ukpn", gas: "net_sgn" },
  // Midlands / South West / Wales
  B: { electricity: "net_nged", gas: "net_cadent" }, CV: { electricity: "net_nged", gas: "net_cadent" },
  NG: { electricity: "net_nged", gas: "net_cadent" }, BS: { electricity: "net_nged", gas: "net_wwu" },
  EX: { electricity: "net_nged", gas: "net_wwu" }, CF: { electricity: "net_nged", gas: "net_wwu" },
  // North
  LS: { electricity: "net_npg", gas: "net_ngn" }, BD: { electricity: "net_npg", gas: "net_ngn" },
  NE: { electricity: "net_npg", gas: "net_ngn" }, M: { electricity: "net_enwl", gas: "net_cadent" },
  // Scotland / South
  G: { electricity: "net_spen", gas: "net_sgn" }, EH: { electricity: "net_spen", gas: "net_sgn" },
  AB: { electricity: "net_ssen", gas: "net_sgn" }, GU: { electricity: "net_ssen", gas: "net_sgn" },
  SO: { electricity: "net_ssen", gas: "net_sgn" }, RG: { electricity: "net_ssen", gas: "net_sgn" },
};

export function indicativeNetworks(postcode: string) {
  const area = postcode.trim().toUpperCase().match(/^[A-Z]{1,2}/)?.[0] ?? "";
  return AREA_NETWORKS[area] ?? {};
}
