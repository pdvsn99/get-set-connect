import "server-only";
// Fictional demonstration data. All people, companies, suppliers, addresses
// and references are made up. Network operator names are real UK networks,
// used only to label areas — no data is ever sent to them.
import { hashPassword } from "../auth/password";
import { demoMpan } from "../integrations/validation";
import { MILESTONES } from "../domain";
import type {
  ActivityEvent,
  Connection,
  Database,
  Milestone,
  Notification,
  Plot,
  Project,
  Responsibility,
  Task,
  Utility,
} from "./types";

export const DEMO_ACCOUNTS = [
  {
    email: "sam@demo.getsetconnect.co.uk",
    password: "demo1234",
    label: "Homeowner — Sam Taylor (one new home)",
  },
  {
    email: "priya@demo.getsetconnect.co.uk",
    password: "demo1234",
    label: "Developer — Priya Shah, Harrow & Vale Homes (The Orchard)",
  },
  {
    email: "ops@demo.getsetconnect.co.uk",
    password: "admin1234",
    label: "Get Set Connect staff — Alex Morgan (admin)",
  },
];

export function buildSeed(): Database {
  const now = Date.now();
  const ago = (days: number, hours = 0) =>
    new Date(now - days * 86_400_000 - hours * 3_600_000).toISOString();
  const ahead = (days: number) => {
    const d = new Date(now + days * 86_400_000);
    d.setUTCHours(9, 0, 0, 0);
    return d.toISOString();
  };
  const demoPw = hashPassword("demo1234");
  const adminPw = hashPassword("admin1234");

  const db: Database = {
    version: 1,
    seq: 1046,
    users: [
      {
        id: "usr_alex",
        email: "ops@demo.getsetconnect.co.uk",
        name: "Alex Morgan",
        passwordHash: adminPw,
        role: "admin",
        createdAt: ago(200),
      },
      {
        id: "usr_jordan",
        email: "jordan@demo.getsetconnect.co.uk",
        name: "Jordan Reid",
        passwordHash: adminPw,
        role: "admin",
        createdAt: ago(150),
      },
      {
        id: "usr_sam",
        email: "sam@demo.getsetconnect.co.uk",
        name: "Sam Taylor",
        phone: "07700 900123",
        passwordHash: demoPw,
        role: "customer",
        organisationId: "org_sam",
        createdAt: ago(40),
      },
      {
        id: "usr_priya",
        email: "priya@demo.getsetconnect.co.uk",
        name: "Priya Shah",
        phone: "07700 900456",
        passwordHash: demoPw,
        role: "customer",
        organisationId: "org_harrow",
        createdAt: ago(120),
      },
      {
        id: "usr_tom",
        email: "tom@demo.getsetconnect.co.uk",
        name: "Tom Okafor",
        phone: "07700 900789",
        passwordHash: demoPw,
        role: "customer",
        organisationId: "org_tom",
        createdAt: ago(1),
      },
      {
        id: "usr_ellis",
        email: "ellis@demo.getsetconnect.co.uk",
        name: "Morgan Ellis",
        passwordHash: demoPw,
        role: "customer",
        organisationId: "org_ellis",
        createdAt: ago(9),
      },
    ],
    organisations: [
      { id: "org_sam", name: "Sam Taylor", kind: "individual", createdAt: ago(40) },
      {
        id: "org_harrow",
        name: "Harrow & Vale Homes Ltd",
        kind: "developer",
        createdAt: ago(120),
      },
      { id: "org_tom", name: "Okafor Property Co", kind: "developer", createdAt: ago(1) },
      { id: "org_ellis", name: "Morgan Ellis", kind: "individual", createdAt: ago(9) },
    ],
    projects: [],
    plots: [],
    connections: [],
    networkOperators: [
      { id: "net_ukpn", name: "UK Power Networks", kind: "DNO", area: "London, South East & East of England" },
      { id: "net_nged", name: "National Grid Electricity Distribution", kind: "DNO", area: "Midlands, South West & South Wales" },
      { id: "net_npg", name: "Northern Powergrid", kind: "DNO", area: "North East & Yorkshire" },
      { id: "net_enwl", name: "Electricity North West", kind: "DNO", area: "North West England" },
      { id: "net_spen", name: "SP Energy Networks", kind: "DNO", area: "Central & Southern Scotland, Merseyside & North Wales" },
      { id: "net_ssen", name: "Scottish and Southern Electricity Networks", kind: "DNO", area: "North Scotland & Central Southern England" },
      { id: "net_cadent", name: "Cadent", kind: "GDN", area: "North West, West Midlands, East of England & North London" },
      { id: "net_sgn", name: "SGN", kind: "GDN", area: "Scotland & Southern England" },
      { id: "net_ngn", name: "Northern Gas Networks", kind: "GDN", area: "North of England" },
      { id: "net_wwu", name: "Wales & West Utilities", kind: "GDN", area: "Wales & South West England" },
    ],
    suppliers: [
      {
        id: "sup_brightwell",
        name: "Brightwell Energy (demo)",
        fuels: ["electricity", "gas"],
        capabilities: ["Smart meters", "New-build meter fits", "Multi-plot bookings"],
        eligibilityNotes: "Demonstration data. Domestic new builds in England and Wales.",
        leadTimeDays: 15,
        leadTimeVerified: true,
        referralArrangement: "Demo: fixed referral fee per completed account (disclosed to customers).",
        acceptingReferrals: true,
        isDemo: true,
        updatedAt: ago(10),
      },
      {
        id: "sup_kestrel",
        name: "Kestrel Power (demo)",
        fuels: ["electricity"],
        capabilities: ["Smart meters", "Three-phase meters", "EV tariff"],
        eligibilityNotes: "Demonstration data. Electricity only. Good fit for heat pump and EV homes.",
        leadTimeDays: 10,
        leadTimeVerified: true,
        referralArrangement: "Demo: higher referral fee per account (must not influence recommendations).",
        acceptingReferrals: true,
        isDemo: true,
        updatedAt: ago(14),
      },
      {
        id: "sup_meadow",
        name: "Meadow Gas & Power (demo)",
        fuels: ["electricity", "gas"],
        capabilities: ["Smart meters", "New-build meter fits"],
        eligibilityNotes: "Demonstration data. Single properties only — no multi-plot bookings.",
        leadTimeDays: 21,
        leadTimeVerified: false,
        referralArrangement: "Demo: no referral arrangement.",
        acceptingReferrals: true,
        isDemo: true,
        updatedAt: ago(30),
      },
      {
        id: "sup_northlight",
        name: "Northlight Energy (demo)",
        fuels: ["electricity", "gas"],
        capabilities: ["Smart meters", "Multi-plot bookings", "Three-phase meters"],
        eligibilityNotes: "Demonstration data. Currently paused for new referrals.",
        leadTimeDays: 12,
        leadTimeVerified: true,
        referralArrangement: "Demo: fixed referral fee per account.",
        acceptingReferrals: false,
        isDemo: true,
        updatedAt: ago(5),
      },
    ],
    appointments: [],
    documents: [],
    tasks: [],
    notes: [],
    activity: [],
    notifications: [],
    history: [],
    drafts: [],
  };

  let idn = 0;
  const id = (p: string) => `${p}_${(++idn).toString(36)}${now.toString(36).slice(-4)}`;

  /** Build milestones: `stage` completed milestones, then the current one. */
  const ms = (
    completed: number,
    current?: { responsible: Responsibility; note?: string; date?: string },
    updatedAt = ago(2),
  ): Milestone[] =>
    MILESTONES.map((m, i): Milestone => {
      if (i < completed)
        return { key: m.key, state: "complete", responsible: "completed", updatedAt };
      if (i === completed && current)
        return {
          key: m.key,
          state: "in_progress",
          responsible: current.responsible,
          note: current.note,
          confirmedDate: current.date,
          updatedAt,
        };
      return { key: m.key, state: "not_started", responsible: "us", updatedAt };
    });

  const addConn = (
    project: Project,
    plot: Plot,
    utility: Utility,
    milestones: Milestone[],
    extra: Partial<Connection> = {},
  ) => {
    const c: Connection = {
      id: id("con"),
      projectId: project.id,
      plotId: plot.id,
      utility,
      milestones,
      networkOperatorId: project.networkOperatorIds[utility],
      updatedAt: ago(2),
      ...extra,
    };
    db.connections.push(c);
    return c;
  };
  const event = (e: Omit<ActivityEvent, "id">) => db.activity.push({ id: id("act"), ...e });
  const notify = (n: Omit<Notification, "id">) => db.notifications.push({ id: id("ntf"), ...n });
  const task = (t: Omit<Task, "id">) => db.tasks.push({ id: id("tsk"), ...t });

  // ── Example A: homeowner, one new-build ──────────────────────────────────
  const willow: Project = {
    id: "prj_willow",
    reference: "GSC-1031",
    organisationId: "org_sam",
    createdById: "usr_sam",
    name: "Willow Cottage",
    projectType: "new_home",
    addressLine: "Land adjacent to 4 Hollow Lane",
    town: "Ashby Green, Bedfordshire",
    postcode: "MK44 9ZQ",
    siteDescription: "Self-build plot next to No. 4, accessed from the farm track.",
    siteContact: { name: "Sam Taylor", phone: "07700 900123" },
    utilities: ["electricity", "gas"],
    interestedIn: ["broadband"],
    startingPoint: { electricity: "scratch", gas: "scratch" },
    existingReferences: {},
    requirements: {
      desiredCompletionDate: ahead(70),
      siteReady: "yes",
      occupied: "no",
      electricity: { phase: "single", evCharger: "yes", heatPump: "no", meterLocation: "external_box" },
      gas: { usage: "standard_home", meterLocation: "external_box" },
      accessNotes: "Gate code 2468. Please call before visiting.",
    },
    status: "awaiting_customer",
    caseOwnerId: "usr_alex",
    networkOperatorIds: { electricity: "net_ukpn", gas: "net_cadent" },
    consent: { authorised: true, at: ago(38), name: "Sam Taylor" },
    createdAt: ago(38),
    updatedAt: ago(1),
  };
  db.projects.push(willow);
  const willowPlot: Plot = { id: "plt_willow", projectId: willow.id, number: 1, name: "Willow Cottage", address: "Land adjacent to 4 Hollow Lane", createdAt: ago(38) };
  db.plots.push(willowPlot);
  addConn(willow, willowPlot, "electricity", ms(2, { responsible: "network", note: "Quote accepted and paid. UK Power Networks are scheduling the works — we're awaiting confirmation of a date." }), {
    networkReference: "UKPN-DEMO-4471023",
    quotation: { amountPence: 214500, status: "paid", receivedAt: ago(20), validUntil: ahead(70) },
  });
  addConn(willow, willowPlot, "gas", ms(1, { responsible: "network", note: "Application submitted to Cadent. We're waiting on their quotation." }), {
    networkReference: "CAD-DEMO-88213",
    quotation: { status: "awaiting" },
  });
  task({
    projectId: willow.id,
    audience: "customer",
    title: "Upload two more photos of your meter box position",
    detail: "Cadent need a photo showing the full wall, and a close-up with a tape measure from the ground. This lets them finish your gas quote.",
    documentCategory: "meter_position",
    status: "open",
    createdById: "usr_alex",
    createdAt: ago(1),
  });
  task({ projectId: willow.id, audience: "internal", title: "Chase Cadent for gas quotation", assigneeId: "usr_alex", dueDate: ahead(2), status: "open", createdById: "usr_alex", createdAt: ago(6) });
  task({ projectId: willow.id, audience: "internal", title: "Ask UKPN for works date", assigneeId: "usr_alex", dueDate: ago(1), status: "open", createdById: "usr_alex", createdAt: ago(8) });
  [
    [38, "Your application has been received. Welcome aboard!", undefined],
    [37, "Your electricity application has been submitted to UK Power Networks.", "electricity"],
    [37, "Your gas application has been submitted to Cadent.", "gas"],
    [20, "We've received the electricity network quotation: £2,145.00.", "electricity"],
    [14, "Your electricity quotation has been accepted and paid. Thanks!", "electricity"],
    [1, "We need another photo before we can proceed with your gas quote.", "gas"],
  ].forEach(([d, message, utility]) =>
    event({ projectId: willow.id, visibility: "customer", message: message as string, utility: utility as Utility | undefined, actorId: "usr_alex", createdAt: ago(d as number) }),
  );
  event({ projectId: willow.id, visibility: "internal", message: "Cadent asked for clearer meter position photos by phone.", actorId: "usr_alex", createdAt: ago(1, 2) });
  notify({ userId: "usr_sam", projectId: willow.id, type: "application_received", title: "Application received", body: "We've got your request for Willow Cottage.", read: true, createdAt: ago(38) });
  notify({ userId: "usr_sam", projectId: willow.id, type: "quotation_received", title: "Electricity quotation received", body: "Your quotation from UK Power Networks is £2,145.00.", read: true, createdAt: ago(20) });
  notify({ userId: "usr_sam", projectId: willow.id, type: "info_required", title: "Over to you — we need one more thing", body: "Please upload two more photos of your meter box position.", read: false, createdAt: ago(1) });
  db.notes.push({ id: id("not"), projectId: willow.id, visibility: "internal", body: "Customer prefers phone calls after 5pm.", authorId: "usr_alex", createdAt: ago(30) });

  // ── Example B: developer, The Orchard (6 plots) ──────────────────────────
  const orchard: Project = {
    id: "prj_orchard",
    reference: "GSC-1018",
    organisationId: "org_harrow",
    createdById: "usr_priya",
    name: "The Orchard",
    projectType: "multiple_homes",
    addressLine: "Orchard Way",
    town: "Kingsbury, Warwickshire",
    postcode: "B78 2ZZ",
    siteContact: { name: "Dave Collins (site manager)", phone: "07700 900321" },
    utilities: ["electricity", "gas"],
    interestedIn: ["water", "broadband"],
    startingPoint: { electricity: "scratch", gas: "scratch" },
    existingReferences: {},
    requirements: {
      desiredCompletionDate: ahead(45),
      siteReady: "yes",
      occupied: "no",
      electricity: { phase: "single", evCharger: "yes", heatPump: "yes", meterLocation: "external_box" },
      gas: { usage: "standard_home", meterLocation: "external_box" },
      accessNotes: "Site office at entrance. Hi-vis and boots required.",
    },
    status: "in_progress",
    caseOwnerId: "usr_alex",
    networkOperatorIds: { electricity: "net_nged", gas: "net_cadent" },
    supplierId: "sup_brightwell",
    consent: { authorised: true, at: ago(110), name: "Priya Shah" },
    createdAt: ago(110),
    updatedAt: ago(0, 3),
  };
  db.projects.push(orchard);
  const orchardPlots: Plot[] = [1, 2, 3, 4, 5, 6].map((n) => ({
    id: `plt_orchard_${n}`,
    projectId: orchard.id,
    number: n,
    name: `Plot ${n} — The Orchard`,
    address: `${n} Orchard Way`,
    createdAt: ago(110),
  }));
  db.plots.push(...orchardPlots);
  const quote = { amountPence: 1_860_000, status: "paid" as const, receivedAt: ago(80) };
  const gquote = { amountPence: 984_000, status: "paid" as const, receivedAt: ago(78) };
  orchardPlots.forEach((p) => {
    const n = p.number;
    const ref = { e: "NGED-DEMO-200917", g: "CAD-DEMO-77120" };
    if (n <= 2) {
      const note = n === 1
        ? "National Grid Electricity Distribution have confirmed the works date."
        : "Works requested. We're awaiting confirmation of a date from the network.";
      addConn(orchard, p, "electricity", ms(2, { responsible: "network", note, date: n === 1 ? ahead(12) : undefined }), { networkReference: ref.e, quotation: quote });
      addConn(orchard, p, "gas", ms(2, { responsible: "network", note: "Cadent are scheduling the gas main extension for plots 1–2. Awaiting confirmation of a date." }), { networkReference: ref.g, quotation: gquote });
    } else if (n <= 4) {
      addConn(orchard, p, "electricity", ms(4, { responsible: n === 4 ? "customer" : "us", note: n === 4 ? "We need meter cabinet photos before the supplier will book the meter fit." : "We're booking your meter fit with Brightwell Energy." }), {
        networkReference: ref.e, quotation: quote, meterPointNumber: demoMpan(`20000012345${n}`), supplierId: "sup_brightwell",
      });
      addConn(orchard, p, "gas", ms(4, { responsible: "us", note: "We're booking your gas meter fit with Brightwell Energy." }), {
        networkReference: ref.g, quotation: gquote, meterPointNumber: `88123450${n}`, supplierId: "sup_brightwell",
      });
    } else if (n === 5) {
      const e = addConn(orchard, p, "electricity", ms(4, { responsible: "supplier", note: "Meter installation booked with Brightwell Energy.", date: ahead(9) }), {
        networkReference: ref.e, quotation: quote, meterPointNumber: demoMpan("200000123455"), supplierId: "sup_brightwell",
      });
      const g = addConn(orchard, p, "gas", ms(4, { responsible: "supplier", note: "Meter installation booked with Brightwell Energy.", date: ahead(9) }), {
        networkReference: ref.g, quotation: gquote, meterPointNumber: "881234505", supplierId: "sup_brightwell",
      });
      [e, g].forEach((c) =>
        db.appointments.push({ id: id("apt"), projectId: orchard.id, connectionId: c.id, kind: "meter_installation", date: ahead(9), slot: "am", status: "booked", notes: "Supplier engineer to call site manager on arrival.", createdAt: ago(3) }),
      );
    } else {
      const e = addConn(orchard, p, "electricity", ms(6), { networkReference: ref.e, quotation: quote, meterPointNumber: demoMpan("200000123456"), supplierId: "sup_brightwell" });
      const g = addConn(orchard, p, "gas", ms(6), { networkReference: ref.g, quotation: gquote, meterPointNumber: "881234506", supplierId: "sup_brightwell" });
      [e, g].forEach((c) =>
        db.appointments.push({ id: id("apt"), projectId: orchard.id, connectionId: c.id, kind: "meter_installation", date: ago(6), slot: "am", status: "completed", createdAt: ago(20) }),
      );
    }
  });
  task({
    projectId: orchard.id,
    plotIds: ["plt_orchard_2", "plt_orchard_4"],
    audience: "customer",
    title: "Upload meter cabinet photos for plots 2 and 4",
    detail: "A clear photo of each meter cabinet with the door open, so the supplier can confirm it's ready.",
    documentCategory: "meter_cabinet",
    status: "open",
    createdById: "usr_alex",
    createdAt: ago(0, 5),
  });
  task({ projectId: orchard.id, audience: "internal", title: "Chase NGED for plot 2 works date", assigneeId: "usr_alex", dueDate: ahead(1), status: "open", createdById: "usr_alex", createdAt: ago(4) });
  task({ projectId: orchard.id, audience: "internal", title: "Book plot 3 meter fit with Brightwell (demo)", assigneeId: "usr_jordan", dueDate: ahead(3), status: "open", createdById: "usr_alex", createdAt: ago(2) });
  const orchardEvents: [number, string, Utility | undefined, string | undefined][] = [
    [110, "Your application has been received for 6 new homes.", undefined, undefined],
    [108, "Your electricity application has been submitted to National Grid Electricity Distribution.", "electricity", undefined],
    [108, "Your gas application has been submitted to Cadent.", "gas", undefined],
    [80, "We've received the electricity network quotation.", "electricity", undefined],
    [78, "We've received the gas network quotation.", "gas", undefined],
    [60, "Both quotations have been accepted and paid.", undefined, undefined],
    [30, "Connection works completed for plots 3–6.", undefined, undefined],
    [20, "Brightwell Energy (demo) has been selected as your supplier.", undefined, undefined],
    [6, "Plot 6 is fully connected. Happy days!", undefined, "plt_orchard_6"],
    [3, "Your electricity and gas meter installation is booked for plot 5.", undefined, "plt_orchard_5"],
    [2, "Your electricity connection date has been confirmed for plot 1.", "electricity", "plt_orchard_1"],
    [0.2, "We need meter cabinet photos for plots 2 and 4 before we can proceed.", undefined, undefined],
  ];
  orchardEvents.forEach(([d, message, utility, plotId]) =>
    event({ projectId: orchard.id, visibility: "customer", message, utility, plotId, actorId: "usr_alex", createdAt: ago(d) }),
  );
  notify({ userId: "usr_priya", projectId: orchard.id, type: "supplier_selected", title: "Supplier selected", body: "Brightwell Energy (demo) will supply The Orchard.", read: true, createdAt: ago(20) });
  notify({ userId: "usr_priya", projectId: orchard.id, type: "connection_completed", title: "Plot 6 is connected!", body: "All connected. Happy days!", read: true, createdAt: ago(6) });
  notify({ userId: "usr_priya", projectId: orchard.id, type: "installation_booked", title: "Meter installation booked — plot 5", body: "Your meter fit is booked. See your timeline for the date.", read: false, createdAt: ago(3) });
  notify({ userId: "usr_priya", projectId: orchard.id, type: "date_confirmed", title: "Network date confirmed — plot 1", body: "The electricity works date for plot 1 is confirmed.", read: false, createdAt: ago(2) });
  notify({ userId: "usr_priya", projectId: orchard.id, type: "info_required", title: "Over to you — meter cabinet photos", body: "Please upload meter cabinet photos for plots 2 and 4.", read: false, createdAt: ago(0, 5) });

  // ── Extra incoming requests so the admin queue has variety ───────────────
  const station: Project = {
    id: "prj_station",
    reference: "GSC-1046",
    organisationId: "org_tom",
    createdById: "usr_tom",
    name: "14 Station Road conversion",
    projectType: "conversion",
    addressLine: "14 Station Road",
    town: "Petersfield, Hampshire",
    postcode: "GU31 9ZX",
    siteContact: { name: "Tom Okafor", phone: "07700 900789" },
    utilities: ["electricity"],
    interestedIn: [],
    startingPoint: { electricity: "not_sure" },
    existingReferences: {},
    requirements: { siteReady: "not_sure", occupied: "no", electricity: { phase: "not_sure", meterLocation: "internal" } },
    status: "submitted",
    networkOperatorIds: { electricity: "net_ssen" },
    consent: { authorised: true, at: ago(1), name: "Tom Okafor" },
    createdAt: ago(1),
    updatedAt: ago(1),
  };
  db.projects.push(station);
  [1, 2, 3].forEach((n) => {
    const p: Plot = { id: `plt_station_${n}`, projectId: station.id, number: n, name: `Flat ${n} — 14 Station Road`, createdAt: ago(1) };
    db.plots.push(p);
    addConn(station, p, "electricity", ms(0, { responsible: "us", note: "We're reviewing your request." }, ago(1)));
  });
  event({ projectId: station.id, visibility: "customer", message: "Your application has been received. Welcome aboard!", createdAt: ago(1) });
  notify({ userId: "usr_tom", projectId: station.id, type: "application_received", title: "Application received", body: "We've got your request for 14 Station Road conversion.", read: false, createdAt: ago(1) });
  task({ projectId: station.id, audience: "internal", title: "Review new request and confirm network area", status: "open", createdById: "usr_alex", createdAt: ago(1), dueDate: ahead(1) });

  const barn: Project = {
    id: "prj_barn",
    reference: "GSC-1039",
    organisationId: "org_ellis",
    createdById: "usr_ellis",
    name: "Hillside Barn",
    projectType: "existing_property",
    addressLine: "Hillside Barn, Moor Lane",
    town: "Hebden, North Yorkshire",
    postcode: "BD23 9ZY",
    utilities: ["gas"],
    interestedIn: [],
    startingPoint: { gas: "applied" },
    existingReferences: { gas: "NGN-DEMO-55102" },
    requirements: { siteReady: "yes", occupied: "yes", gas: { usage: "large_home", meterLocation: "external_box" } },
    status: "in_progress",
    caseOwnerId: "usr_jordan",
    networkOperatorIds: { gas: "net_ngn" },
    consent: { authorised: true, at: ago(9), name: "Morgan Ellis" },
    createdAt: ago(9),
    updatedAt: ago(4),
  };
  db.projects.push(barn);
  const barnPlot: Plot = { id: "plt_barn", projectId: barn.id, number: 1, name: "Hillside Barn", createdAt: ago(9) };
  db.plots.push(barnPlot);
  addConn(barn, barnPlot, "gas", ms(1, { responsible: "network", note: "We've linked your existing application and are waiting on Northern Gas Networks' quote." }, ago(4)), {
    networkReference: "NGN-DEMO-55102", quotation: { status: "awaiting" },
  });
  event({ projectId: barn.id, visibility: "customer", message: "Your application has been received. Welcome aboard!", createdAt: ago(9) });
  event({ projectId: barn.id, visibility: "customer", message: "We've linked your existing gas application with Northern Gas Networks.", utility: "gas", createdAt: ago(4) });

  return db;
}
