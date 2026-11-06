"use client";
import { useState } from "react";
import { updateMilestone } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import type { Milestone, MilestoneKey, Responsibility } from "@/lib/db/types";
import { MILESTONES, RESPONSIBILITY } from "@/lib/domain";

export function MilestoneEditor({
  connectionId,
  milestones,
  currentKey,
  multi,
}: {
  connectionId: string;
  milestones: Milestone[];
  currentKey: MilestoneKey;
  multi: boolean;
}) {
  const [key, setKey] = useState<MilestoneKey>(currentKey);
  const m = milestones.find((x) => x.key === key)!;
  const id = (s: string) => `${connectionId}-${s}`;
  const sel = "field-input py-2 text-sm";
  return (
    <ActionForm action={updateMilestone} className="space-y-3">
      <input type="hidden" name="connectionId" value={connectionId} />
      {/* key forces defaults to refresh when a different milestone is picked */}
      <div key={key} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={id("key")} className="text-xs font-bold">Milestone</label>
          <select id={id("key")} name="key" className={sel} value={key} onChange={(e) => setKey(e.target.value as MilestoneKey)}>
            {MILESTONES.map((d, i) => (
              <option key={d.key} value={d.key}>{i + 1}. {d.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={id("state")} className="text-xs font-bold">State</label>
          <select id={id("state")} name="state" className={sel} defaultValue={m.state}>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="complete">Complete</option>
          </select>
        </div>
        <div>
          <label htmlFor={id("resp")} className="text-xs font-bold">Who&apos;s responsible</label>
          <select id={id("resp")} name="responsible" className={sel} defaultValue={m.responsible === "completed" ? "us" : m.responsible}>
            {(Object.keys(RESPONSIBILITY) as Responsibility[]).filter((r) => r !== "completed").map((r) => (
              <option key={r} value={r}>{RESPONSIBILITY[r].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={id("date")} className="text-xs font-bold">Confirmed date <span className="font-normal text-navy-900/50">(only if confirmed)</span></label>
          <input id={id("date")} type="date" name="confirmedDate" className={sel} defaultValue={m.confirmedDate?.slice(0, 10)} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={id("note")} className="text-xs font-bold">Customer-facing note</label>
          <input id={id("note")} name="note" className={sel} defaultValue={m.note} placeholder="E.g. Awaiting a works date from the network." />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-navy-900" /> Notify customer</label>
        {multi && <label className="flex items-center gap-2"><input type="checkbox" name="applyAll" className="h-4 w-4 accent-navy-900" /> Apply to all plots</label>}
        <SubmitButton size="sm" variant="dark" className="ml-auto">Update milestone</SubmitButton>
      </div>
    </ActionForm>
  );
}
