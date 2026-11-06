import "server-only";
// Integration adapters.
//
// Every external process (network applications, supplier referrals, address
// lookup, notifications) goes through an adapter with a small interface. In
// this proof of concept every adapter is MANUAL or MOCK — nothing is sent to
// any external organisation. To go live with an API, write a new adapter that
// implements the same interface and switch it in `integrations` below; the
// customer experience doesn't change.

import type { Utility } from "../db/types";
import { normalisePostcode } from "./validation";

export interface AdapterInfo {
  name: string;
  mode: "manual" | "mock" | "live";
  description: string;
}

export interface NetworkApplicationAdapter extends AdapterInfo {
  /** Record that an application should be submitted. Returns a tracking note. */
  submit(input: {
    projectReference: string;
    utility: Utility;
    operatorName?: string;
  }): Promise<{ status: "queued_for_manual_submission"; note: string }>;
}

export interface SupplierReferralAdapter extends AdapterInfo {
  refer(input: {
    projectReference: string;
    supplierName: string;
  }): Promise<{ status: "recorded_for_manual_follow_up"; note: string }>;
}

export interface AddressLookupAdapter extends AdapterInfo {
  lookup(postcode: string): Promise<{
    postcode: string | null;
    addresses: string[];
    note: string;
  }>;
}

export interface NotificationChannel extends AdapterInfo {
  send(input: { to: string; subject: string; body: string }): Promise<void>;
}

const manualNetwork: NetworkApplicationAdapter = {
  name: "Manual network applications",
  mode: "manual",
  description:
    "Creates an internal task for the operations team to submit the application through the network operator's own portal.",
  async submit({ projectReference, utility, operatorName }) {
    return {
      status: "queued_for_manual_submission",
      note: `Submit ${utility} application for ${projectReference}${
        operatorName ? ` to ${operatorName}` : ""
      } via the operator's portal, then record the reference here.`,
    };
  },
};

const manualSupplier: SupplierReferralAdapter = {
  name: "Manual supplier referrals",
  mode: "manual",
  description:
    "Records the chosen supplier. No account is created and no data is sent to the supplier.",
  async refer({ projectReference, supplierName }) {
    return {
      status: "recorded_for_manual_follow_up",
      note: `Contact ${supplierName} to arrange the account and meter for ${projectReference}.`,
    };
  },
};

const mockAddress: AddressLookupAdapter = {
  name: "Postcode check (mock)",
  mode: "mock",
  description:
    "Checks the postcode format only. A real address lookup service can be added later.",
  async lookup(postcode) {
    return {
      postcode: normalisePostcode(postcode),
      addresses: [],
      note: "Address lookup isn't connected in this demo — please type the address.",
    };
  },
};

const inAppOnly: NotificationChannel = {
  name: "Email (not connected)",
  mode: "mock",
  description:
    "Emails are not sent in the proof of concept. Customers see notifications in the app.",
  async send({ to, subject }) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mock email] to=${to} subject="${subject}"`);
    }
  },
};

export const integrations = {
  network: manualNetwork,
  supplierReferral: manualSupplier,
  address: mockAddress,
  email: inAppOnly,
};

export function listIntegrations(): AdapterInfo[] {
  return Object.values(integrations).map(({ name, mode, description }) => ({
    name,
    mode,
    description,
  }));
}
