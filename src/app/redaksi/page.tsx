import Link from "next/link";
import { ArrowDownUp, FileCheck2, MoreVertical, Search } from "lucide-react";
import { AccountShell } from "@/components/account-shell";
import { DashboardImage } from "@/components/dashboard-image";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/kontributor/dashboard.module.css";
import queue from "./queue.module.css";

const statuses = ["submitted", "revision", "approved", "published", "rejected", "archived"] as const;
const labels = { submitted: "Menunggu", revision: "Perlu revisi", approved: "Disetujui", published: "Terbit", rejected: "Ditolak", archived: "Arsip" };

export default async function Editorial({ searchParams }: PageProps<"/redaksi">) {
  const profile = await requireRole(["editor", "admin"]);
  const { status = "submitted", page: rawPage = "1", q: rawQuery = "", order = "oldest" } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery).trim().slice(0, 100);
  const oldest = order !== "newest";
  const active = statuses.includes(status as typeof statuses[number]) ? status as typeof statuses[number] : "submitted";
  const from = (page - 1) * 20;
  const supabase = await createClient();
  let articleQuery = supabase.from("articles").select("id,title,status,location,cover_url,submitted_at,profiles!articles_author_id_fkey(full_name),categories(name)", { count: "exact" }).eq("status", active);
  if (query) articleQuery = articleQuery.ilike("title", `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
  const { data, count, error } = await articleQuery.order("submitted_at", { ascending: oldest }).range(from, from + 19);
  if (error) throw new Error("Antrean belum dapat dimuat.");

  return <AccountShell role={profile.role} className={styles.dashboard}><div className={styles.main}>
    <div className={styles.panelHeading}><div><h1>Antrean redaksi</h1><p>Periksa isi, beri catatan, dan putuskan kelayakan tulisan.</p></div><FileCheck2 aria-hidden="true" /></div>
    <nav className={styles.filters} aria-label="Filter status tulisan">{statuses.map(item => <Link href={`/redaksi?status=${item}`} aria-current={item === active ? "page" : undefined} key={item}>{labels[item]}</Link>)}</nav>
    <section className={styles.panel} aria-labelledby="queue-heading">
      <h2 id="queue-heading" className={queue.srOnly}>Daftar tulisan {labels[active]}</h2>
      <div className={queue.tools}><form action="/redaksi"><input type="hidden" name="status" value={active} /><input type="hidden" name="order" value={oldest ? "oldest" : "newest"} /><label><span className={queue.srOnly}>Cari judul artikel</span><input name="q" defaultValue={query} placeholder="Cari artikel" maxLength={100} /><button type="submit" aria-label="Cari artikel"><Search aria-hidden="true" /></button></label></form><Link className={queue.order} href={`/redaksi?status=${active}&order=${oldest ? "newest" : "oldest"}${query ? `&q=${encodeURIComponent(query)}` : ""}`} aria-label={oldest ? "Urutkan terbaru" : "Urutkan terlama"}><ArrowDownUp aria-hidden="true" /></Link></div>
      {data?.length ? <div className={queue.list}>{data.map(article => <article className={queue.item} key={article.id}>
        {article.cover_url ? <DashboardImage src={article.cover_url} className={queue.image} /> : <div className={queue.fallback}><FileCheck2 aria-hidden="true" /></div>}
        <div className={queue.copy}><div className={queue.meta}><span className={`${queue.status} ${queue[article.status]}`}>{labels[article.status as keyof typeof labels]}</span><time dateTime={article.submitted_at ?? undefined}>{article.submitted_at ? `Dikirim ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Makassar" }).format(new Date(article.submitted_at))}` : "Belum dikirim"}</time></div><h3><Link href={`/redaksi/${article.id}`}>{article.title || "Tanpa judul"}</Link></h3><p>{(article.profiles as unknown as { full_name: string } | null)?.full_name ?? "Penulis"} · {(article.categories as unknown as { name: string } | null)?.name ?? "Tanpa kanal"} · {article.location || "Kalimantan Timur"}</p></div>
        <details className={queue.menu}><summary aria-label={`Aksi untuk ${article.title || "tulisan"}`}><MoreVertical aria-hidden="true" /></summary><div><Link href={`/redaksi/${article.id}`}>Periksa tulisan</Link></div></details>
      </article>)}</div> : <div className={styles.empty}><FileCheck2 aria-hidden="true" /><h3>Antrean bersih</h3><p>Tidak ada tulisan dengan status ini.</p></div>}
    </section>
    <nav className={styles.pagination} aria-label="Halaman antrean">{page > 1 && <Link href={`/redaksi?status=${active}&page=${page - 1}&order=${oldest ? "oldest" : "newest"}&q=${encodeURIComponent(query)}`}>← Sebelumnya</Link>}{(count ?? 0) > page * 20 && <Link href={`/redaksi?status=${active}&page=${page + 1}&order=${oldest ? "oldest" : "newest"}&q=${encodeURIComponent(query)}`}>Berikutnya →</Link>}</nav>
  </div></AccountShell>;
}
