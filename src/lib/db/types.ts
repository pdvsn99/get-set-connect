// Core data model for Get Set Connect.
// This mirrors the PostgreSQL schema in supabase/migrations/0001_init.sql so the
// demo store can be swapped for Supabase without changing the rest of the app.

export type Role = "customer" | "admin";
export type Utility = "electricity" | "gas";
export type FutureUtility = "water" | "broadband";

export type ProjectType =
  | "new_home"
  | "multiple_homes"
  | "conversion"
  | "existing_property";

export type ProjectStatus =
  | "submitted"
  | "in_progress"
  | "awaiting_customer"
  | "completed"
  | "withdrawn";

/** Where the customer told us they were when they applied. */
export type StartingPoint =
  | "scratch"
  | "applied"
  | "quoted"
  | "works_underway"
  | "ready_for_meters"
  | "not_sure";

/** The six customer-facing milestones. */
export type MilestoneKey =
  | "received"
  | "network_application"
  | "works_arranged"
  | "works_completed"
  | "meter_arranged"
  | "connected";

export type MilestoneState = "not_started" | "in_progress" | "complete";

/** Who the ball is with. */
export type Responsibility =
  | "us"
  | "network"
  | "supplier"
  | "customer"
  | "completed";

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  passwordHash: string;
  role: Role;
  organisationId?: string;
  createdAt: string;
}

export interface Organisation {
  id: string;
  name: string;
  kind: "individual" | "developer";
  createdAt: string;
}

export interface Contact {
  name: string;
  phone?: string;
  email?: string;
}

export interface Requirements {
  desiredCompletionDate?: string;
  siteReady?: "yes" | "no" | "not_sure";
  occupied?: "yes" | "no";
  electricity?: {
    phase?: "single" | "three" | "not_sure";
    loadKva?: string;
    evCharger?: "yes" | "no" | "not_sure";
    heatPump?: "yes" | "no" | "not_sure";
    meterLocation?: "external_box" | "internal" | "not_sure";
  };
  gas?: {
    usage?: "standard_home" | "large_home" | "not_sure";
    meterLocation?: "external_box" | "internal" | "not_sure";
  };
  accessNotes?: string;
}

export interface Project {
  id: string;
  reference: string; // e.g. GSC-1042
  organisationId: string;
  createdById: string;
  name: string; // development or property name
  projectType: ProjectType;
  addressLine?: string;
  town?: string;
  postcode: string;
  siteDescription?: string; // used when no postal address yet
  siteContact?: Contact;
  utilities: Utility[];
  interestedIn: FutureUtility[];
  startingPoint: Partial<Record<Utility, StartingPoint>>;
  existingReferences: Partial<Record<Utility, string>>;
  requirements: Requirements;
  status: ProjectStatus;
  caseOwnerId?: string;
  networkOperatorIds: Partial<Record<Utility, string>>;
  supplierId?: string;
  consent: { authorised: boolean; at: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface Plot {
  id: string;
  projectId: string;
  number: number;
  name: string; // "Plot 1 — The Orchard"
  address?: string;
  createdAt: string;
}

export interface Quotation {
  amountPence?: number;
  status: "awaiting" | "received" | "accepted" | "paid" | "expired" | "declined";
  receivedAt?: string;
  validUntil?: string;
  notes?: string;
}

export interface Milestone {
  key: MilestoneKey;
  state: MilestoneState;
  responsible: Responsibility;
  confirmedDate?: string; // only ever a confirmed date — never an estimate
  note?: string; // customer-visible explanation
  updatedAt: string;
}

/** One utility for one plot. */
export interface Connection {
  id: string;
  projectId: string;
  plotId: string;
  utility: Utility;
  milestones: Milestone[];
  networkOperatorId?: string;
  networkReference?: string;
  quotation?: Quotation;
  meterPointNumber?: string; // MPAN for electricity, MPRN for gas
  supplierId?: string;
  updatedAt: string;
}

export interface NetworkOperator {
  id: string;
  name: string;
  kind: "DNO" | "GDN" | "IDNO" | "IGT";
  area: string;
}

export interface Supplier {
  id: string;
  name: string;
  fuels: Utility[];
  capabilities: string[];
  eligibilityNotes: string;
  leadTimeDays?: number;
  leadTimeVerified: boolean;
  referralArrangement?: string;
  acceptingReferrals: boolean;
  isDemo: boolean;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  projectId: string;
  connectionId: string;
  kind: "meter_installation" | "network_works";
  date: string; // ISO date
  slot?: "am" | "pm" | "all_day";
  status: "booked" | "completed" | "cancelled";
  notes?: string;
  createdAt: string;
}

export type DocumentCategory =
  | "site_plan"
  | "location_plan"
  | "meter_position"
  | "cut_out"
  | "gas_ecv"
  | "meter_cabinet"
  | "other";

export interface StoredDocument {
  id: string;
  projectId: string;
  plotId?: string;
  category: DocumentCategory;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  uploadedById: string;
  status: "received" | "accepted" | "needs_replacement";
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  plotIds?: string[];
  audience: "customer" | "internal";
  title: string;
  detail?: string;
  documentCategory?: DocumentCategory;
  assigneeId?: string;
  dueDate?: string;
  status: "open" | "done";
  createdById: string;
  createdAt: string;
  completedAt?: string;
}

export interface Note {
  id: string;
  projectId: string;
  visibility: "customer" | "internal";
  body: string;
  authorId: string;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  projectId: string;
  plotId?: string;
  utility?: Utility;
  visibility: "customer" | "internal";
  message: string;
  actorId?: string;
  createdAt: string;
}

export type NotificationType =
  | "application_received"
  | "info_required"
  | "quotation_received"
  | "date_confirmed"
  | "supplier_selected"
  | "installation_booked"
  | "connection_completed"
  | "update";

export interface Notification {
  id: string;
  userId: string;
  projectId?: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

/** Audit trail — every admin change, for the "history of changes" view. */
export interface HistoryEntry {
  id: string;
  projectId: string;
  actorId: string;
  summary: string;
  before?: string;
  after?: string;
  createdAt: string;
}

export interface Draft {
  userId: string;
  data: unknown;
  updatedAt: string;
}

export interface Database {
  version: number;
  seq: number; // used for human-readable references
  users: User[];
  organisations: Organisation[];
  projects: Project[];
  plots: Plot[];
  connections: Connection[];
  networkOperators: NetworkOperator[];
  suppliers: Supplier[];
  appointments: Appointment[];
  documents: StoredDocument[];
  tasks: Task[];
  notes: Note[];
  activity: ActivityEvent[];
  notifications: Notification[];
  history: HistoryEntry[];
  drafts: Draft[];
}
