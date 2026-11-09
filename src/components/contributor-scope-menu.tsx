"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import styles from "./contributor-scope-menu.module.css";

export function ContributorScopeMenu({ scope }: { scope: "review" | "mine" }) {
  const menu = useRef<HTMLDetailsElement>(null);
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

  return <details ref={menu} className={styles.menu}>
    <summary>{scope === "review" ? "Antrian Redaksi" : "Tulisan Saya"}<ChevronDown size={15} aria-hidden="true" /></summary>
    <div>
      <Link href="/kontributor?tab=artikel&scope=review&status=submitted#dashboard-panel" aria-current={scope === "review" ? "page" : undefined}>Antrian Redaksi{scope === "review" && <Check size={15} aria-hidden="true" />}</Link>
      <Link href="/kontributor?tab=artikel&scope=mine#dashboard-panel" aria-current={scope === "mine" ? "page" : undefined}>Tulisan Saya{scope === "mine" && <Check size={15} aria-hidden="true" />}</Link>
    </div>
  </details>;
}
