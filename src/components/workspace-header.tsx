import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { getSessionProfile } from "@/lib/dal";

export async function WorkspaceHeader({ label }: { label: string }) {
  const profile = await getSessionProfile();
  const isEditor = profile && ["editor", "admin"].includes(profile.role);
  return <header className="workspace-top"><div className="shell">
    <Link className="brand" href="/">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/brand/kaltim-insider.png" alt="Kaltim Insider"/></Link>
    <nav className="workspace-nav" aria-label="Navigasi ruang kerja">
      <Link href="/dashboard">Tulisan saya</Link>
      <Link href="/dashboard/profil">Profil</Link>
      <Link href="/dashboard/notifikasi">Notifikasi</Link>
      {isEditor && <Link href="/redaksi">Redaksi</Link>}
      {profile?.role === "admin" && <Link href="/admin">Admin</Link>}
      <span>{label}</span>
      <form action={signOut}><button type="submit">Keluar</button></form>
    </nav>
  </div></header>;
}
