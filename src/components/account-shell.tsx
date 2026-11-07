import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { categories } from "@/lib/data";
import { slugify } from "@/lib/editorial";
import styles from "@/app/kontributor/profil/profile.module.css";

export function AccountShell({ children, role, className = "" }: { children: ReactNode; role: string; className?: string }) {
  return <div className={`${styles.page} ${className}`}>
    <header className={styles.topbar}><div className={styles.topbarInner}>
      <Link href="/" aria-label="Kaltim Insider"><Image src="/brand/kaltim-insider.png" alt="Kaltim Insider" width={248} height={70} priority /></Link>
      <div className={styles.topbarActions}>
        {["editor", "admin"].includes(role) && <Link className={styles.redaksiButton} href="/redaksi">Redaksi</Link>}
        <details className={styles.accountMenu}><summary className={styles.menu}>Menu <Menu size={19} /></summary><div>
          <Link href="/kontributor">Dashboard</Link><Link href="/kontributor/tulis">Tulis Artikel</Link><Link href="/kontributor/profil">Profil</Link><Link href="/kontributor/notifikasi">Notifikasi</Link>
          {["editor", "admin"].includes(role) && <Link href="/redaksi">Redaksi</Link>}{role === "admin" && <Link href="/admin">Admin</Link>}
          <form action={signOut}><button type="submit">Keluar</button></form>
        </div></details>
      </div>
    </div></header>
    <main className={styles.main}><section className={styles.card}><div className={styles.cardInner}>{children}</div></section></main>
    <footer className={styles.footer}><div className={styles.footerInner}><div><strong>KANAL KALTIM INSIDER</strong><nav className={styles.ecosystem} aria-label="Kanal berita">{categories.map(item => <Link href={`/kanal/${slugify(item)}`} key={item}>{item}</Link>)}</nav></div><div className={styles.footerBrand}><Image src="/brand/kaltim-insider.png" alt="Kaltim Insider" width={248} height={70} /><p>Hak cipta © 2026 Kaltim Insider. Seluruh hak dilindungi.</p><p>Informasi dari Kalimantan Timur untuk semua.</p></div></div></footer>
  </div>;
}
