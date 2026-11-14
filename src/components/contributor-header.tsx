import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { DashboardImage } from "@/components/dashboard-image";
import { categories } from "@/lib/data";
import { slugify } from "@/lib/editorial";
import styles from "@/app/dashboard/dashboard.module.css";

type HeaderProfile = { full_name: string; avatar_url: string | null; role: string };

export function ContributorHeader({ profile }: { profile: HeaderProfile }) {
  return <header className={styles.header}><div className={styles.headerTop}>
    <Link href="/" className={styles.logo} aria-label="Kaltim Insider"><DashboardImage src="/brand/kaltim-insider.png" /></Link>
    <div className={styles.headerTools}><Link href="/cari" aria-label="Cari berita"><Search size={26} /></Link><Link href="/dashboard/profil" aria-label="Profil saya" className={styles.headerAvatar}>{profile.avatar_url ? <DashboardImage src={profile.avatar_url} /> : profile.full_name?.trim().charAt(0).toUpperCase() || "K"}</Link></div>
  </div><nav className={styles.categoryNav} aria-label="Kanal berita"><Link href="/">Beranda</Link>{categories.map(category => <Link href={`/kanal/${slugify(category)}`} key={category}>{category}</Link>)}<details className={styles.accountMenu}><summary aria-label="Menu penulis"><Menu size={25} /></summary><div><Link href="/dashboard?tab=artikel#dashboard-panel">Tulisan saya</Link><Link href="/dashboard/profil">Pengaturan profil</Link><Link href="/dashboard/notifikasi">Notifikasi</Link>{["editor", "admin"].includes(profile.role) && <Link href="/redaksi">Redaksi</Link>}{profile.role === "admin" && <Link href="/admin">Admin</Link>}<form action={signOut}><button type="submit">Keluar</button></form></div></details></nav>
  <nav className={styles.quickNav} aria-label="Pintasan penulis"><strong>Untuk<br />Kamu</strong><Link href="/dashboard/tulis">Mulai cerita baru</Link><Link href="/dashboard?tab=artikel#dashboard-panel">Kelola artikel</Link><Link href="/dashboard?tab=panduan#dashboard-panel">Panduan menulis</Link><Link href="/dashboard/kegiatan">Event menulis</Link></nav></header>;
}
