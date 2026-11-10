"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { DashboardImage } from "@/components/dashboard-image";
import styles from "@/app/kontributor/profil/profile.module.css";

export function AccountMenu({ role, avatarUrl }: { role: string; avatarUrl?: string | null }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const editorial = role === "admin" || role === "editor";
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (menu.current?.open && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current?.open) menu.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, []);
  return <details ref={menu} className={styles.accountMenu}><summary className={styles.menu}>Menu <Menu size={19} /></summary><div>
    <Link className={styles.accountCard} href="/kontributor/profil">
      <Image className={styles.accountBrand} src="/brand/kaltim-insider.png" alt="" width={248} height={70} />
      <span className={styles.accountProfile}><DashboardImage src={avatarUrl || "/default-profile.jpeg"} className={styles.accountAvatar} /><span className={styles.accountCopy}><strong>Akun Saya</strong><span>Kelola profil dan informasi akunmu.</span></span></span>
      <ArrowUpRight aria-hidden="true" />
    </Link>
    <nav className={styles.accountLinks} aria-label="Menu akun">
      <Link href="/kontributor">Dasbor</Link>
      <Link href={editorial ? "/redaksi" : "/kontributor/artikel"}>Kelola Artikel</Link>
      <Link href="/kontributor/tulis">Tulis Artikel</Link>
      <Link href="/kontributor/notifikasi">Notifikasi</Link>
      <Link href="/kontributor/kegiatan">Event</Link>
      <Link href="/kontributor/panduan">Panduan &amp; FAQ</Link>
      {role === "contributor" && <Link href="/kontributor/redaktur">Ajukan Redaktur</Link>}
      {role === "admin" && <><Link href="/admin/redaktur">Pengajuan Redaktur</Link><Link href="/admin">Kelola Akun</Link></>}
    </nav>
    <form action={signOut}><button type="submit">Keluar</button></form>
  </div></details>;
}
