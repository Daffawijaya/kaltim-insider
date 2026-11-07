import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { AccountShell } from "@/components/account-shell";
import { DashboardImage } from "@/components/dashboard-image";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/kontributor/dashboard.module.css";

const statuses = ["submitted", "revision", "approved", "published", "rejected", "archived"] as const;
const labels = { submitted: "Menunggu", revision: "Perlu revisi", approved: "Disetujui", published: "Terbit", rejected: "Ditolak", archived: "Arsip" };

export default async function Editorial({ searchParams }: PageProps<"/redaksi">) {
  const profile = await requireRole(["editor", "admin"]);
  const { status = "submitted", page: rawPage = "1" } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const active = statuses.includes(status as typeof statuses[number]) ? status as typeof statuses[number] : "submitted";
  const from = (page - 1) * 20;
  const supabase = await createClient();
  const { data, count, error } = await supabase.from("articles").select("id,title,status,location,cover_url,submitted_at,profiles!articles_author_id_fkey(full_name),categories(name)", { count: "exact" }).eq("status", active).order("submitted_at", { ascending: true }).range(from, from + 19);
  if (error) throw new Error("Antrean belum dapat dimuat.");

  return <AccountShell role={profile.role} className={styles.dashboard}><div className={styles.main}>
    <div className={styles.panelHeading}><div><h1>Antrean redaksi</h1><p>Periksa isi, beri catatan, dan putuskan kelayakan tulisan.</p></div><FileCheck2 aria-hidden="true" /></div>
    <nav className={styles.filters} aria-label="Filter status tulisan">{statuses.map(item => <Link href={`/redaksi?status=${item}`} aria-current={item === active ? "page" : undefined} key={item}>{labels[item]}</Link>)}</nav>
    <section className={styles.panel} aria-labelledby="queue-heading">
      <div className={styles.panelHeading}><div><h2 id="queue-heading">{labels[active]}</h2><p>{count ?? 0} tulisan</p></div></div>
      {data?.length ? <div className={styles.submissions}>{data.map(article => <article className={styles.submission} key={article.id}>
        {article.cover_url ? <DashboardImage src={article.cover_url} className={styles.submissionImage} /> : <div className={styles.coverFallback}><FileCheck2 aria-hidden="true" /></div>}
        <div><span className={`status ${article.status === "published" ? "published" : article.status === "revision" ? "revision" : article.status === "rejected" ? "rejected" : "review"}`}>{labels[article.status as keyof typeof labels]}</span><h3>{article.title || "Tanpa judul"}</h3><p>{(article.profiles as unknown as { full_name: string } | null)?.full_name ?? "Penulis"} · {(article.categories as unknown as { name: string } | null)?.name ?? "Tanpa kanal"} · {article.location || "Kalimantan Timur"}</p><time dateTime={article.submitted_at ?? undefined}>{article.submitted_at ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Makassar" }).format(new Date(article.submitted_at)) : "Belum dikirim"}</time></div>
        <Link className="button" href={`/redaksi/${article.id}`}>Periksa</Link>
      </article>)}</div> : <div className={styles.empty}><FileCheck2 aria-hidden="true" /><h3>Antrean bersih</h3><p>Tidak ada tulisan dengan status ini.</p></div>}
    </section>
    <nav className={styles.pagination} aria-label="Halaman antrean">{page > 1 && <Link href={`/redaksi?status=${active}&page=${page - 1}`}>← Sebelumnya</Link>}{(count ?? 0) > page * 20 && <Link href={`/redaksi?status=${active}&page=${page + 1}`}>Berikutnya →</Link>}</nav>
  </div></AccountShell>;
}
