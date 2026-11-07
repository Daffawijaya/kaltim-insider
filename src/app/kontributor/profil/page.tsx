import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CreditCard, Menu, ShieldCheck, Smartphone, Trash2, UserRound } from "lucide-react";
import { ProfileForm } from "@/components/profile-form";
import { requireUser } from "@/lib/dal";
import styles from "./profile.module.css";

export default async function ProfilePage() {
  const user = await requireUser();
  return <div className={styles.page}>
    <header className={styles.topbar}><div className={styles.topbarInner}><Link href="/" aria-label="Kaltim Insider"><Image src="/brand/kaltim-insider.png" alt="Kaltim Insider" width={248} height={70} priority /></Link><Link href="/kontributor" className={styles.menu}>Menu <Menu size={19} /></Link></div></header>
    <main className={styles.main}>
      <section className={styles.card}><div className={styles.cardInner}>
        <Link href="/kontributor" className={styles.back} aria-label="Kembali ke dashboard"><ArrowLeft size={20} /></Link>
        <h1>Biodata</h1>
        <nav className={styles.tabs} aria-label="Pengaturan akun"><span className={styles.active}><UserRound />Biodata</span><span><Smartphone />Kontak</span><span><ShieldCheck />Akun</span><span><CreditCard />Rekening</span><span><Trash2 />Hapus Akun</span></nav>
        <ProfileForm profile={user} />
      </div></section>
    </main>
    <footer className={styles.footer}><div className={styles.footerInner}><div><strong>SATU AKUN UNTUK SEMUA LAYANAN KALTIM INSIDER</strong><div className={styles.ecosystem}>{["Berita", "Komunitas", "Ekonomi", "Pendidikan", "Teknologi", "Budaya", "Wisata", "Lingkungan", "Olahraga", "Opini", "Gaya Hidup", "Daerah"].map(item => <span key={item}>{item}</span>)}</div></div><div className={styles.footerBrand}><Image src="/brand/kaltim-insider.png" alt="Kaltim Insider" width={248} height={70} /><p>Hak cipta © 2026 Kaltim Insider. Seluruh hak dilindungi.</p><p>Informasi dari Kalimantan Timur untuk semua.</p></div></div></footer>
  </div>;
}
