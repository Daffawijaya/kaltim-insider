import { CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import { joinEvent } from "@/app/actions/events";
import { AccountPageHeader } from "@/components/account-page-header";
import { AccountShell } from "@/components/account-shell";
import { EventForm } from "@/components/event-form";
import { requireUser } from "@/lib/dal";
import { localDate } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import styles from "../dashboard.module.css";
import eventStyles from "./events.module.css";

export default async function ActivitiesPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: events, error }, { data: participations, error: participationError }] = await Promise.all([
    supabase.from("events").select("id,title,organizer,description,requirements,starts_on,ends_on").order("starts_on", { ascending: false }),
    supabase.from("event_participants").select("event_id").eq("user_id", user.id),
  ]);
  if (error || participationError) throw new Error("Event belum dapat dimuat.");
  const joined = new Set((participations ?? []).map(item => item.event_id));
  const today = localDate();
  const format = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  return <AccountShell role={user.role} className={styles.dashboard}><div className={styles.main}>
    <AccountPageHeader title="Event" />
    <div className={eventStyles.layout}><section className={eventStyles.list}>
      {!events?.length ? <div className={eventStyles.empty}><CalendarDays aria-hidden="true" /><h2>Belum ada event</h2><p>Event menulis akan ditampilkan di sini.</p></div> : events.map(event => {
        const active = event.starts_on <= today && event.ends_on >= today;
        const participating = joined.has(event.id);
        return <article className={eventStyles.event} key={event.id}><h2>{event.title}</h2><div className={eventStyles.meta}><span><strong>{event.organizer}</strong></span><span><Clock3 size={15} aria-hidden="true" /> {format(event.starts_on)}–{format(event.ends_on)}</span></div><p>{event.description}</p><div className={eventStyles.requirements}><strong>Syarat dan ketentuan</strong><p>{event.requirements}</p></div><footer>{participating ? <span className={eventStyles.joined}><CheckCircle2 size={15} aria-hidden="true" /> Sudah bergabung</span> : active ? <form action={joinEvent.bind(null, event.id)}><button className="button primary">Ikuti event</button></form> : <span className={eventStyles.closed}>{today < event.starts_on ? "Pendaftaran belum dibuka" : "Event telah berakhir"}</span>}</footer></article>;
      })}
    </section>{user.role === "admin" && <EventForm />}</div>
  </div></AccountShell>;
}
