"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

export function DashboardImage({ src, className }: { src: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  return failedSrc === src
    ? <span className={className} aria-hidden="true" style={{ display: "grid", placeItems: "center", background: "var(--wash)", color: "var(--muted)" }}><ImageOff size={24} /></span>
    // eslint-disable-next-line @next/next/no-img-element
    : <img src={src} alt="" className={className} onError={() => setFailedSrc(src)} />;
}
