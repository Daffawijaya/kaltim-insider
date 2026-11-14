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
      <p className="account-kicker">{mode==="signin"?"Selamat datang kembali":"Jadi penulis"}</p>
      <h1>{mode==="signin"?"Masuk ke akun":"Buat akun Kaltim Insider"}</h1>
      <p className="account-intro">{mode==="signin"?"Lanjutkan menulis dan berbagi kabar dari Kalimantan Timur.":"Daftar untuk mulai mengirim tulisan dan cerita dari daerahmu."}</p>
      <AuthForm mode={mode}/>
    </section>
  </main>
}
