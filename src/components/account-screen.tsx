import {legalPages} from "@/lib/legal";
import Image from "next/image";
import Link from "next/link";
import {AuthForm} from "@/components/auth-form";

export function AccountScreen({mode}:{mode:"signin"|"signup"}){
  return <main className="account-page">
    <header className="account-header">
      <Link href="/" aria-label="Kembali ke beranda"><Image className="account-logo" src="/brand/kaltim-insider.png" alt="Kaltim Insider" width={1722} height={233} priority/></Link>
      <Link className="account-close" href="/" aria-label="Tutup">×</Link>
    </header>
    <section className="account-panel">
      <p className="account-kicker">{mode==="signin"?"Selamat datang kembali":"Jadi kontributor"}</p>
      <h1>{mode==="signin"?"Masuk ke akun":"Buat akun Kaltim Insider"}</h1>
      <p className="account-intro">{mode==="signin"?"Lanjutkan menulis dan berbagi kabar dari Kalimantan Timur.":"Daftar untuk mulai mengirim tulisan dan cerita dari daerahmu."}</p>
      <AuthForm mode={mode}/>
    </section>
    <footer className="account-footer">
      <Link href="/">Pelajari lebih lanjut tentang akun Kaltim Insider</Link>
      <nav aria-label="Tautan akun">{Object.entries(legalPages).map(([path,item])=><Link href={`/${path}`} key={path}>{item.title}</Link>)}</nav>
      <p>Hak cipta © 2026 Kaltim Insider. Kaltim Insider tidak bertanggung jawab atas isi situs eksternal. <Link href="/tautan-eksternal">Baca kebijakan tautan eksternal kami.</Link></p>
    </footer>
  </main>
}
