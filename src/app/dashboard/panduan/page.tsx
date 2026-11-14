import Link from "next/link";
import { AccountPageHeader } from "@/components/account-page-header";
import { AccountShell } from "@/components/account-shell";
import { requireUser } from "@/lib/dal";
import styles from "../dashboard.module.css";

export default async function GuidePage() {
  const user = await requireUser();
  const editorial = user.role === "admin" || user.role === "editor";
  return <AccountShell role={user.role} className={styles.dashboard}><div className={styles.main}>
    <AccountPageHeader title="Panduan & FAQ" />
    <section className={`${styles.panel} ${styles.subpagePanel}`}><div className={styles.faq}>
      <details open><summary>Bagaimana cara membuat tulisan?</summary><p>Buka <Link href="/dashboard/tulis">Tulis Artikel</Link>, lengkapi data, lalu simpan atau kirim tulisanmu.</p></details>
      <details><summary>Di mana saya melihat status tulisan?</summary><p>Buka <Link href={editorial ? "/redaksi" : "/dashboard/artikel"}>Kelola Artikel</Link> untuk melihat tulisan, status, dan catatan redaksi.</p></details>
      <details><summary>Apa arti perlu revisi?</summary><p>Redaksi meminta perbaikan sebelum tulisan dapat diterbitkan. Buka tulisan terkait untuk membaca catatan dan memperbaruinya.</p></details>
    </div></section>
  </div></AccountShell>;
}
