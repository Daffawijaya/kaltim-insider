import { CalendarDays } from "lucide-react";
import { AccountShell } from "@/components/account-shell";
import { requireUser } from "@/lib/dal";
import styles from "../dashboard.module.css";

export default async function ActivitiesPage() {
  const user = await requireUser();
  return <AccountShell role={user.role} className={styles.dashboard}><div className={styles.main}>
    <div className={styles.panelHeading}><div><h1>Kegiatan</h1><p>Agenda dan kegiatan komunitas Kaltim Insider.</p></div><CalendarDays aria-hidden="true" /></div>
    <section className={styles.panel}><div className={styles.empty}><CalendarDays aria-hidden="true" /><h3>Belum ada kegiatan</h3><p>Informasi kegiatan penulis akan ditampilkan saat tersedia.</p></div></section>
  </div></AccountShell>;
}
