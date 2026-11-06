import Link from "next/link";
import { BellOff, CalendarCheck, CheckCircle2, CircleAlert, FileText, Inbox, PartyPopper, PoundSterling, Store } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/customer";
import { SubmitButton } from "@/components/forms";
import { Card, EmptyState } from "@/components/ui";
import { requireCustomer } from "@/lib/auth/session";
import { readDb } from "@/lib/db/store";
import type { NotificationType } from "@/lib/db/types";
import { formatDateTime, timeAgo } from "@/lib/domain";

export const metadata = { title: "Notifications" };

const ICON: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  application_received: Inbox,
  info_required: CircleAlert,
  quotation_received: PoundSterling,
  date_confirmed: CalendarCheck,
  supplier_selected: Store,
  installation_booked: CalendarCheck,
  connection_completed: PartyPopper,
  update: FileText,
};

export default async function NotificationsPage() {
  const user = await requireCustomer();
  const db = await readDb();
  const items = db.notifications.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = items.filter((n) => !n.read).length;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Notifications</h1>
          <p className="mt-1 text-navy-900/70">{unread ? `${unread} unread` : "You're all caught up."}</p>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <SubmitButton variant="secondary" size="sm" pendingText="Marking…"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Mark all as read</SubmitButton>
          </form>
        )}
      </div>
      {items.length === 0 ? (
        <div className="mt-8"><EmptyState icon={<BellOff className="h-10 w-10 text-navy-900/40" />} title="No notifications yet" body="We'll let you know here whenever something changes." /></div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((n) => {
            const Icon = ICON[n.type];
            const project = db.projects.find((p) => p.id === n.projectId);
            return (
              <li key={n.id}>
                <Card className={`flex gap-4 p-4 sm:p-5 ${n.read ? "opacity-75" : "ring-2 ring-lime-400"}`}>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${n.type === "info_required" ? "bg-coral-100 text-coral-700" : n.type === "connection_completed" ? "bg-lime-300" : "bg-navy-900/5"}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">{!n.read && <span className="sr-only">Unread: </span>}{n.title}</p>
                    <p className="text-navy-900/75">{n.body}</p>
                    <p className="mt-1 text-xs text-navy-900/50">
                      <time dateTime={n.createdAt} title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</time>
                      {project && <> · <Link href={`/portal/projects/${project.id}`} className="font-bold underline">{project.name}</Link></>}
                    </p>
                  </div>
                  {!n.read && (
                    <form action={markNotificationRead.bind(null, n.id)}>
                      <button className="rounded-full px-3 py-1.5 text-xs font-bold hover:bg-navy-900/5">Mark read</button>
                    </form>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
