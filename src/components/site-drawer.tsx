"use client";

import Link from "next/link";
import { X, Search, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { drawerMenu } from "@/lib/data";

export function SiteDrawer({ open, onClose, isActive }: { open: boolean; onClose(): void; isActive(path: string): boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState<string | null>(() => drawerMenu.find(item => item.sub?.some(sub => isActive(sub.href)) || isActive(item.href))?.href ?? null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => input.current?.focus(), 220);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previous; window.clearTimeout(timer); };
  }, [open, onClose]);

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
        {drawerMenu.map(item => item.sub ? (
          <div key={item.href} className="drawer-group">
            <div className="drawer-item-row">
              <Link className="drawer-item drawer-item-link" href={item.href} onClick={onClose} aria-current={isActive(item.href) ? "page" : undefined}>{item.label}</Link>
              <button type="button" className="drawer-item-toggle" aria-expanded={expanded === item.href} aria-controls={`drawer-sub-${item.label.replace(/\W+/g, "-")}`} aria-label={`${expanded === item.href ? "Tutup" : "Buka"} sub-kanal ${item.label}`} onClick={() => setExpanded(expanded === item.href ? null : item.href)}>
                <ChevronDown size={17} strokeWidth={2} className="drawer-chevron" aria-hidden="true" />
              </button>
            </div>
            <div id={`drawer-sub-${item.label.replace(/\W+/g, "-")}`} className={`drawer-subitems${expanded === item.href ? " open" : ""}`} role="list">
              {item.sub.map(sub => <Link key={sub.href} className="drawer-subitem" href={sub.href} onClick={onClose} aria-current={isActive(sub.href) ? "page" : undefined}>{sub.label}</Link>)}
            </div>
          </div>
        ) : (
          <Link key={item.href} className="drawer-item" href={item.href} onClick={onClose} aria-current={isActive(item.href) ? "page" : undefined}>{item.label}</Link>
        ))}
      </nav>
    </aside>
  </div>;
}
