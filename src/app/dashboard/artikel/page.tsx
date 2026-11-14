import Link from "next/link";
import { ArrowDownUp, FileText, MoreVertical, Search } from "lucide-react";
import { AccountShell } from "@/components/account-shell";
import { AccountPageHeader } from "@/components/account-page-header";
import { DashboardImage } from "@/components/dashboard-image";
import { contributorArticleSearch } from "@/lib/contributor";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import styles from "../dashboard.module.css";
import queue from "@/app/redaksi/queue.module.css";

const statuses = ["draft", "submitted", "revision", "approved", "published", "rejected", "archived"] as const;
const labels = { draft: "Draf", submitted: "Menunggu", revision: "Perlu revisi", approved: "Disetujui", published: "Terbit", rejected: "Ditolak", archived: "Arsip" };
const date = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Makassar" }).format(new Date(value));

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const active = statuses.find(value => value === params.status);
  const { query, pattern, oldest } = contributorArticleSearch(params);
  const from = (page - 1) * 20;
  const supabase = await createClient();
  let request = supabase.from("articles").select("id,title,slug,status,location,cover_url,updated_at,view_count,categories(name)", { count: "exact" }).eq("author_id", user.id);
  if (active) request = request.eq("status", active);
  if (query) request = request.ilike("title", pattern);
  const { data, count, error } = await request.order("updated_at", { ascending: oldest }).order("id").range(from, from + 19);
  if (error) throw new Error("Tulisan belum dapat dimuat.");

  const href = (nextPage = 1, nextStatus: string = active ?? "", nextOrder = oldest) => {
    const search = new URLSearchParams({ page: String(nextPage), order: nextOrder ? "oldest" : "newest" });
    if (nextStatus) search.set("status", nextStatus);
    if (query) search.set("q", query);
    return `/dashboard/artikel?${search}`;
  };

  return <AccountShell role={user.role} className={styles.dashboard}><div className={styles.main}>
    <AccountPageHeader title="Kelola Artikel" />
    <section className={`${styles.panel} ${styles.subpagePanel}`}>
      <nav className={styles.filters} aria-label="Filter status tulisan"><Link href={href(1, "")} aria-current={!active ? "page" : undefined}>Semua</Link>{statuses.map(item => <Link href={href(1, item)} aria-current={item === active ? "page" : undefined} key={item}>{labels[item]}</Link>)}</nav>
      <div className={queue.tools}><form action="/dashboard/artikel">{active && <input type="hidden" name="status" value={active} />}<input type="hidden" name="order" value={oldest ? "oldest" : "newest"} /><label><span className={queue.srOnly}>Cari judul artikel</span><input name="q" defaultValue={query} placeholder="Cari artikel" maxLength={100} /><button type="submit" aria-label="Cari artikel"><Search aria-hidden="true" /></button></label></form><Link className={queue.order} href={href(1, active, !oldest)} aria-label={oldest ? "Urutkan terbaru" : "Urutkan terlama"}><ArrowDownUp aria-hidden="true" /></Link></div>
      {data?.length ? <div className={queue.list}>{data.map(article => <article className={queue.item} key={article.id}>
        {article.cover_url ? <DashboardImage src={article.cover_url} className={queue.image} /> : <div className={queue.fallback}><FileText aria-hidden="true" /></div>}
        <div className={queue.copy}><div className={queue.meta}><span className={`${queue.status} ${queue[article.status]}`}>{labels[article.status as keyof typeof labels]}</span><time dateTime={article.updated_at}>Diperbarui {date(article.updated_at)}</time></div><h3><Link href={`/dashboard/tulis?id=${article.id}`}>{article.title || "Tanpa judul"}</Link></h3><p>{(article.categories as unknown as { name: string } | null)?.name ?? "Tanpa kanal"} · {article.location || "Kalimantan Timur"}{article.status === "published" && ` · ${new Intl.NumberFormat("id-ID").format(article.view_count)} tayangan`}</p></div>
        <details className={queue.menu}><summary aria-label={`Aksi untuk ${article.title || "tulisan"}`}><MoreVertical aria-hidden="true" /></summary><div><Link href={`/dashboard/tulis?id=${article.id}`}>Buka tulisan</Link>{article.status === "published" && article.slug && <Link href={`/artikel/${article.slug}`}>Lihat artikel terbit</Link>}</div></details>
      </article>)}</div> : <div className={styles.empty}><FileText aria-hidden="true" /><h3>{query ? "Tidak ada artikel yang cocok" : "Belum ada tulisan"}</h3><p>{query ? "Coba kata kunci lain atau ubah filter status." : "Tulisan yang kamu buat akan muncul di sini."}</p><Link className="button primary" href="/dashboard/tulis">Tulis sekarang</Link></div>}
    </section>
    <nav className={styles.pagination} aria-label="Halaman tulisan">{page > 1 && <Link href={href(page - 1)}>← Sebelumnya</Link>}{(count ?? 0) > page * 20 && <Link href={href(page + 1)}>Berikutnya →</Link>}</nav>
  </div></AccountShell>;
}
