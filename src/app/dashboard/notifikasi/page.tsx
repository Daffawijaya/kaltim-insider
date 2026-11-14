import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { markNotificationsRead } from "@/app/actions/notifications";
import { AccountPageHeader } from "@/components/account-page-header";
import { AccountShell } from "@/components/account-shell";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import styles from "../dashboard.module.css";

const date = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("notifications").select("id,article_id,title,message,read_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error("Notifikasi belum dapat dimuat.");

  return <AccountShell role={user.role} className={styles.dashboard}><div className={styles.main}>
    <AccountPageHeader title="Notifikasi" />
    <section className={`${styles.panel} ${styles.subpagePanel}`}>
      {!!data?.some(item => !item.read_at) && <div className={styles.notificationHeading}><form action={markNotificationsRead}><button className="button">Tandai sudah dibaca</button></form></div>}
      {data?.length ? <div className={styles.notifications}>{data.map(item => <Link href={item.article_id ? `/dashboard/tulis?id=${item.article_id}` : "/dashboard/notifikasi"} className={`${styles.notification} ${!item.read_at ? styles.unread : ""}`} key={item.id}><Bell size={18} aria-hidden="true" /><div><strong>{item.title}</strong>{!item.read_at && <span className={styles.newLabel}>Belum dibaca</span>}<p>{item.message}</p><time dateTime={item.created_at}>{date(item.created_at)}</time></div><ChevronRight size={16} aria-hidden="true" /></Link>)}</div> : <div className={styles.empty}><Bell aria-hidden="true" /><h3>Belum ada notifikasi</h3><p>Kabar dan catatan dari redaksi akan muncul di sini.</p></div>}
    </section>
  </div></AccountShell>;
}
