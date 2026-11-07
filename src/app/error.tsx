"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="shell listing-page"><h1>Layanan belum tersedia</h1><p>Data belum dapat dimuat. Coba lagi beberapa saat.</p><button className="button" onClick={reset}>Coba lagi</button></main>;
}
