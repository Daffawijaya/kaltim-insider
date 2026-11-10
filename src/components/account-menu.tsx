"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { DashboardImage } from "@/components/dashboard-image";
import styles from "@/app/kontributor/profil/profile.module.css";

export function AccountMenu({ role, avatarUrl }: { role: string; avatarUrl?: string | null }) {
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const editorial = role === "admin" || role === "editor";
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (open && !menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [open]);
  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 700px)").matches) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [open]);
  const close = () => setOpen(false);
  return <div ref={menu} className={styles.accountMenu}><button type="button" className={styles.menu} aria-expanded={open} aria-controls="account-menu-panel" onClick={() => setOpen(value => !value)}>Menu <Menu size={19} /></button><div id="account-menu-panel" className={`${styles.accountPanel} ${open ? styles.accountPanelOpen : ""}`} aria-hidden={!open} inert={!open}>
    <button type="button" className={styles.accountClose} onClick={close} aria-label="Tutup menu"><X /></button>
    <Link className={styles.accountCard} href="/kontributor/profil" onClick={close}>
      <Image className={styles.accountBrand} src="/brand/kaltim-insider.png" alt="" width={248} height={70} />
      <span className={styles.accountProfile}><DashboardImage src={avatarUrl || "/default-profile.jpeg"} className={styles.accountAvatar} /><span className={styles.accountCopy}><strong>Akun Saya</strong><span>Kelola profil dan informasi akunmu.</span></span></span>
      <ArrowUpRight aria-hidden="true" />
    </Link>
    <nav className={styles.accountLinks} aria-label="Menu akun" onClick={close}>
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
  </div></div>;
}
