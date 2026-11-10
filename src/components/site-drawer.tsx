"use client";

import Link from "next/link";
import { X, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { categories } from "@/lib/data";
import { slugify } from "@/lib/editorial";

export function SiteDrawer({ open, onClose, isActive }: { open: boolean; onClose(): void; isActive(path: string): boolean }) {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => input.current?.focus(), 220);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previous; window.clearTimeout(timer); };
  }, [open, onClose]);

  const items = [{ href: "/", label: "Beranda" }, { href: "/kanal/terbaru", label: "Terbaru" }, ...categories.map(category => ({ href: `/kanal/${slugify(category)}`, label: category }))];

  return <div className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
    <button type="button" className="drawer-overlay" onClick={onClose} aria-label="Tutup menu" tabIndex={open ? 0 : -1} />
    <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label="Menu kanal">
      <button type="button" className="drawer-close" onClick={onClose} aria-label="Tutup menu"><X size={26} strokeWidth={2} /></button>
      <form className="drawer-search" action="/cari" role="search">
        <label className="drawer-sr" htmlFor="drawer-q">Pencarian</label>
        <input id="drawer-q" ref={input} name="q" placeholder="Cari berita, topik, dan lainnya" autoComplete="off" />
        <button type="submit" aria-label="Cari"><Search size={20} strokeWidth={2} /></button>
      </form>
      <nav className="drawer-nav" aria-label="Kanal utama">
        {items.map(item => <Link href={item.href} key={item.href} onClick={onClose} aria-current={isActive(item.href) ? "page" : undefined}>{item.label}</Link>)}
      </nav>
    </aside>
  </div>;
}
