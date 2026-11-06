// Supplier recommendation.
//
// IMPORTANT: referral / commission arrangements are deliberately NOT an input
// to this score. Recommendations are based on suitability for the customer
// only, and the reasons are shown to staff so every choice is explainable.
import type { Connection, Project, Supplier } from "./db/types";

export interface Recommendation {
  supplier: Supplier;
  score: number;
  eligible: boolean;
  reasons: string[];
  warnings: string[];
}

export function recommendSuppliers(
  suppliers: Supplier[],
  project: Project,
  connections: Connection[],
): Recommendation[] {
  const plots = new Set(connections.map((c) => c.plotId)).size;
  const needed = project.utilities;
  const wantsThreePhase = project.requirements.electricity?.phase === "three";
  const lowCarbon =
    project.requirements.electricity?.evCharger === "yes" ||
    project.requirements.electricity?.heatPump === "yes";
  const desired = project.requirements.desiredCompletionDate
    ? Math.round((new Date(project.requirements.desiredCompletionDate).getTime() - Date.now()) / 86_400_000)
    : undefined;

  return suppliers
    .map((s) => {
      const reasons: string[] = [];
      const warnings: string[] = [];
      let score = 0;
      let eligible = true;

      if (!s.acceptingReferrals) {
        eligible = false;
        warnings.push("Not accepting referrals at the moment");
      }
      const covers = needed.filter((u) => s.fuels.includes(u));
      if (covers.length === needed.length) {
        score += 40;
        reasons.push(needed.length > 1 ? "Supplies both electricity and gas" : `Supplies ${needed[0]}`);
      } else if (covers.length) {
        score += 15;
        warnings.push(`Only supplies ${covers.join(" and ")} — a second supplier would be needed`);
      } else {
        eligible = false;
        warnings.push("Doesn't supply the fuels needed");
      }
      const caps = s.capabilities.map((c) => c.toLowerCase());
      if (plots > 1) {
        if (caps.some((c) => c.includes("multi-plot"))) {
          score += 20;
          reasons.push("Handles multi-plot bookings");
        } else {
          score -= 15;
          warnings.push("No multi-plot bookings");
        }
      }
      if (["new_home", "multiple_homes", "conversion"].includes(project.projectType) && caps.some((c) => c.includes("new-build"))) {
        score += 10;
        reasons.push("Experienced with new-build meter fits");
      }
      if (wantsThreePhase) {
        if (caps.some((c) => c.includes("three-phase"))) {
          score += 15;
          reasons.push("Can fit three-phase meters");
        } else {
          score -= 20;
          warnings.push("No three-phase meters");
        }
      }
      if (lowCarbon && caps.some((c) => c.includes("ev") || c.includes("heat pump"))) {
        score += 8;
        reasons.push("Suits EV chargers / heat pumps");
      }
      if (s.leadTimeDays !== undefined) {
        if (s.leadTimeVerified) {
          score += Math.max(0, 15 - Math.round(s.leadTimeDays / 2));
          reasons.push(`Verified lead time of about ${s.leadTimeDays} days`);
          if (desired !== undefined && s.leadTimeDays > desired) warnings.push("Lead time may miss the customer's preferred date");
        } else {
          warnings.push("Lead time not verified");
        }
      }
      return { supplier: s, score, eligible, reasons, warnings };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.supplier.name.localeCompare(b.supplier.name));
}
