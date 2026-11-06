// MPAN / MPRN / postcode validation.
// These are real format checks that run locally — no external service is called.
// A future adapter could add a live industry lookup (e.g. ECOES / DES) behind
// the same functions.

const MPAN_PRIMES = [3, 5, 7, 13, 17, 19, 23, 29, 31, 37, 41, 43];

/** Validates the 13-digit MPAN "core" using the standard check digit. */
export function validateMpan(input: string): { ok: boolean; message?: string } {
  const digits = input.replace(/\s+/g, "");
  if (!/^\d{13}$/.test(digits)) {
    return { ok: false, message: "An MPAN core is 13 digits long." };
  }
  const sum = MPAN_PRIMES.reduce((s, p, i) => s + p * Number(digits[i]), 0);
  const check = (sum % 11) % 10;
  if (check !== Number(digits[12])) {
    return {
      ok: false,
      message: "That MPAN doesn't look quite right — please double-check it.",
    };
  }
  return { ok: true };
}

/** MPRNs are 6–10 digits. There's no public check digit, so this is a format check. */
export function validateMprn(input: string): { ok: boolean; message?: string } {
  const digits = input.replace(/\s+/g, "");
  if (!/^\d{6,10}$/.test(digits)) {
    return { ok: false, message: "An MPRN is usually 6 to 10 digits." };
  }
  return { ok: true };
}

const POSTCODE_RE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;

export function normalisePostcode(input: string): string | null {
  const m = input.trim().match(POSTCODE_RE);
  if (!m) return null;
  return `${m[1].toUpperCase()} ${m[2].toUpperCase()}`;
}

/** Builds a valid-checksum MPAN for demo data. */
export function demoMpan(prefix12: string): string {
  const sum = MPAN_PRIMES.reduce((s, p, i) => s + p * Number(prefix12[i]), 0);
  return prefix12 + String((sum % 11) % 10);
}
