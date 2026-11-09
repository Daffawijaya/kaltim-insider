import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { categories } from "@/lib/data";
import { getSessionProfile } from "@/lib/dal";
import { slugify } from "@/lib/editorial";
import styles from "@/app/kontributor/profil/profile.module.css";

export async function AccountShell({ children, role, className = "" }: { children: ReactNode; role: string; className?: string }) {
  const profile = await getSessionProfile();
  return <div className={`${styles.page} ${className}`}>
    <header className={styles.topbar}><div className={styles.topbarInner}>
      <Link href="/" aria-label="Kaltim Insider"><Image src="/brand/kaltim-insider.png" alt="Kaltim Insider" width={248} height={70} priority /></Link>
      <div className={styles.topbarActions}>
        <AccountMenu role={role} avatarUrl={profile?.avatar_url} />
      </div>
    </div></header>
    <main className={styles.main}><section className={styles.card}><div className={styles.cardInner}>{children}</div></section></main>
    <footer className={styles.footer}><div className={styles.footerInner}><div><strong>KANAL KALTIM INSIDER</strong><nav className={styles.ecosystem} aria-label="Kanal berita">{categories.map(item => <Link href={`/kanal/${slugify(item)}`} key={item}>{item}</Link>)}</nav></div><div className={styles.footerBrand}><Image src="/brand/kaltim-insider.png" alt="Kaltim Insider" width={248} height={70} /><p>Hak cipta © 2026 Kaltim Insider. Seluruh hak dilindungi.</p><p>Informasi dari Kalimantan Timur untuk semua.</p></div></div></footer>
  </div>;
}
