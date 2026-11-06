import { saveSupplier } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Pill } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { readDb } from "@/lib/db/store";
import type { Supplier } from "@/lib/db/types";
import { formatDate } from "@/lib/domain";

export const metadata = { title: "Suppliers" };

const inp = "field-input py-2 text-sm";
const lbl = "text-xs font-bold";

function SupplierForm({ s }: { s?: Supplier }) {
  const id = s?.id ?? "new";
  return (
    <ActionForm action={saveSupplier} className="grid gap-3 sm:grid-cols-2" resetOnSuccess={!s}>
      {s && <input type="hidden" name="id" value={s.id} />}
      <div>
        <label htmlFor={`n-${id}`} className={lbl}>Supplier name</label>
        <input id={`n-${id}`} name="name" defaultValue={s?.name} required className={inp} />
      </div>
      <fieldset>
        <legend className={lbl}>Fuels</legend>
        <div className="mt-2 flex gap-4 text-sm">
          <label className="flex items-center gap-1.5"><input type="checkbox" name="fuels" value="electricity" defaultChecked={s?.fuels.includes("electricity") ?? true} className="accent-navy-900" /> Electricity</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" name="fuels" value="gas" defaultChecked={s?.fuels.includes("gas") ?? true} className="accent-navy-900" /> Gas</label>
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <label htmlFor={`c-${id}`} className={lbl}>Installation capabilities <span className="font-normal text-navy-900/50">(comma separated)</span></label>
        <input id={`c-${id}`} name="capabilities" defaultValue={s?.capabilities.join(", ")} className={inp} placeholder="Smart meters, New-build meter fits, Multi-plot bookings, Three-phase meters" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`e-${id}`} className={lbl}>General eligibility notes</label>
        <input id={`e-${id}`} name="eligibilityNotes" defaultValue={s?.eligibilityNotes} className={inp} />
      </div>
      <div>
        <label htmlFor={`l-${id}`} className={lbl}>Indicative lead time (days)</label>
        <input id={`l-${id}`} name="leadTimeDays" type="number" min={0} defaultValue={s?.leadTimeDays} className={inp} />
      </div>
      <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="leadTimeVerified" defaultChecked={s?.leadTimeVerified} className="accent-navy-900" /> Lead time verified</label>
      <div className="sm:col-span-2">
        <label htmlFor={`r-${id}`} className={lbl}>Referral arrangement <span className="font-normal text-navy-900/50">(recorded for transparency — never used to rank)</span></label>
        <input id={`r-${id}`} name="referralArrangement" defaultValue={s?.referralArrangement} className={inp} />
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2">
        <label className="flex items-center gap-2"><input type="checkbox" name="acceptingReferrals" defaultChecked={s?.acceptingReferrals ?? true} className="accent-navy-900" /> Accepting referrals</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isDemo" defaultChecked={s?.isDemo ?? true} className="accent-navy-900" /> Demonstration data</label>
        <SubmitButton size="sm" variant="dark" className="ml-auto">{s ? "Save changes" : "Add supplier"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export default async function SuppliersPage() {
  await requireAdmin();
  const db = await readDb();
  return (
    <>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Suppliers</h1>
      <p className="max-w-3xl text-navy-900/65">
        Manually maintained supplier information used for recommendations. All suppliers below are <strong>fictional demonstration data</strong>. Recommendations rank suppliers on suitability, availability and customer needs only — referral arrangements are recorded for transparency and are never part of the ranking. No live switching or account sign-up happens from here.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {db.suppliers.map((s) => (
          <details key={s.id} className="group rounded-2xl bg-white p-5 shadow-card">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold">{s.name}</h2>
                {s.isDemo && <Pill>Demo data</Pill>}
                <Pill tone={s.acceptingReferrals ? "green" : "coral"}>{s.acceptingReferrals ? "Accepting referrals" : "Paused"}</Pill>
              </div>
              <p className="mt-1 text-sm text-navy-900/70">{s.fuels.join(" + ")} · {s.capabilities.join(", ") || "No capabilities recorded"}</p>
              <p className="text-sm text-navy-900/70">Lead time: {s.leadTimeDays !== undefined ? `${s.leadTimeDays} days${s.leadTimeVerified ? " (verified)" : " (unverified)"}` : "unknown"} · Updated {formatDate(s.updatedAt)}</p>
              <p className="mt-1 text-xs text-navy-900/55">{s.eligibilityNotes}</p>
              <p className="mt-1 text-xs text-navy-900/55">Referral: {s.referralArrangement ?? "None recorded"}</p>
              <span className="mt-2 inline-block text-sm font-bold underline group-open:hidden">Edit</span>
            </summary>
            <div className="mt-4 border-t border-navy-900/5 pt-4"><SupplierForm s={s} /></div>
          </details>
        ))}
      </div>

      <section className="mt-8 rounded-2xl bg-white p-5 shadow-card">
        <h2 className="text-lg font-extrabold">Add a supplier</h2>
        <div className="mt-3"><SupplierForm /></div>
      </section>
    </>
  );
}
