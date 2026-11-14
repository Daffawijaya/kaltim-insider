import Link from "next/link";
import { ArrowDownUp, FileCheck2, MoreVertical, Search } from "lucide-react";
import { AccountShell } from "@/components/account-shell";
import { AccountPageHeader } from "@/components/account-page-header";
import { DashboardImage } from "@/components/dashboard-image";
import { requireRole } from "@/lib/dal";
import { contributorArticleSearch } from "@/lib/contributor";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/dashboard/dashboard.module.css";
import queue from "./queue.module.css";

const ownStatuses = ["draft", "published", "archived"] as const;
const reviewStatuses = ["submitted", "revision", "published", "rejected", "archived"] as const;
const labels = { draft: "Draf", submitted: "Menunggu", revision: "Perlu revisi", approved: "Disetujui", published: "Terbit", rejected: "Ditolak", archived: "Arsip" };
const date = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Makassar" }).format(new Date(value));

export default async function Editorial({ searchParams }: PageProps<"/redaksi">) {
  const profile = await requireRole(["editor", "admin"]);
  const params = await searchParams;
  const { status, page: rawPage = "1" } = params;
  const scope = params.scope === "mine" ? "mine" : "review";
  const statuses = scope === "mine" ? ownStatuses : reviewStatuses;
  const page = Math.max(1, Number(rawPage) || 1);
  const { query, pattern, oldest } = contributorArticleSearch(params);
  const active = statuses.find(value => value === status) ?? (scope === "review" ? "submitted" : undefined);
  const from = (page - 1) * 20;
  const supabase = await createClient();
  let articleQuery = scope === "review"
    ? supabase.from("articles").select("id,title,slug,status,location,cover_url,created_at,updated_at,submitted_at,view_count,profiles!articles_author_id_fkey!inner(full_name,role),categories(name)", { count: "exact" }).eq("profiles.role", "contributor").neq("author_id", profile.id)
    : supabase.from("articles").select("id,title,slug,status,location,cover_url,created_at,updated_at,submitted_at,view_count,profiles!articles_author_id_fkey(full_name,role),categories(name)", { count: "exact" }).eq("author_id", profile.id);
  if (active) articleQuery = articleQuery.eq("status", active);
  if (query) articleQuery = articleQuery.ilike("title", pattern);
  const { data, count, error } = await articleQuery.order(scope === "review" ? "submitted_at" : "updated_at", { ascending: oldest }).order("id").range(from, from + 19);
  if (error) throw new Error("Tulisan belum dapat dimuat.");
  const href = (nextPage = 1, nextStatus: string = active ?? "", nextOrder = oldest) => {
    const search = new URLSearchParams({ scope, page: String(nextPage), order: nextOrder ? "oldest" : "newest" });
    if (nextStatus) search.set("status", nextStatus);
    if (query) search.set("q", query);
    return `/redaksi?${search}`;
  };

  return <AccountShell role={profile.role} className={styles.dashboard}><div className={styles.main}>
    <AccountPageHeader title="Kelola Artikel" />
    <section className={`${styles.panel} ${styles.subpagePanel} ${queue.editorialPanel}`} aria-labelledby="queue-heading">
      <h2 id="queue-heading" className={queue.srOnly}>{scope === "review" ? "Antrian redaksi" : "Tulisan saya"}</h2>
      <nav className={`${styles.tabs} ${queue.editorialTabs}`} aria-label="Ruang kelola artikel"><Link href="/redaksi?scope=review&status=submitted" aria-current={scope === "review" ? "page" : undefined}>Antrian Redaksi</Link><Link href="/redaksi?scope=mine" aria-current={scope === "mine" ? "page" : undefined}>Tulisan Saya</Link></nav>
      <nav className={styles.filters} aria-label="Filter status tulisan">{scope === "mine" && <Link href={href(1, "")} aria-current={!active ? "page" : undefined}>Semua</Link>}{statuses.map(item => <Link href={href(1, item)} aria-current={item === active ? "page" : undefined} key={item}>{labels[item]}</Link>)}</nav>
      <div className={queue.tools}><form action="/redaksi"><input type="hidden" name="scope" value={scope} />{active && <input type="hidden" name="status" value={active} />}<input type="hidden" name="order" value={oldest ? "oldest" : "newest"} /><label><span className={queue.srOnly}>Cari judul artikel</span><input name="q" defaultValue={query} placeholder="Cari artikel" maxLength={100} /><button type="submit" aria-label="Cari artikel"><Search aria-hidden="true" /></button></label></form><Link className={queue.order} href={href(1, active, !oldest)} aria-label={oldest ? "Urutkan terbaru" : "Urutkan terlama"}><ArrowDownUp aria-hidden="true" /></Link></div>
      {data?.length ? <div className={queue.list}>{data.map(article => { const articleLink = scope === "review" ? `/redaksi/${article.id}` : `/dashboard/tulis?id=${article.id}`; const author = (article.profiles as unknown as { full_name: string } | null)?.full_name; return <article className={queue.item} key={article.id}>
        {article.cover_url ? <DashboardImage src={article.cover_url} className={queue.image} /> : <div className={queue.fallback}><FileCheck2 aria-hidden="true" /></div>}
        <div className={queue.copy}><div className={queue.meta}><span className={`${queue.status} ${queue[article.status]}`}>{labels[article.status as keyof typeof labels]}</span><time dateTime={article.submitted_at ?? article.updated_at}>{scope === "review" && article.submitted_at ? `Dikirim ${date(article.submitted_at)}` : `Diperbarui ${date(article.updated_at)}`}</time></div><h3><Link href={articleLink}>{article.title || "Tanpa judul"}</Link></h3><p>{scope === "review" && `${author ?? "Penulis"} · `}{(article.categories as unknown as { name: string } | null)?.name ?? "Tanpa kanal"} · {article.location || "Kalimantan Timur"}{article.status === "published" && ` · ${new Intl.NumberFormat("id-ID").format(article.view_count)} tayangan`}</p></div>
        <details className={queue.menu}><summary aria-label={`Aksi untuk ${article.title || "tulisan"}`}><MoreVertical aria-hidden="true" /></summary><div><Link href={articleLink}>{scope === "review" ? "Periksa tulisan" : "Buka tulisan"}</Link>{article.status === "published" && article.slug && <Link href={`/artikel/${article.slug}`}>Lihat artikel terbit</Link>}</div></details>
      </article>})}</div> : <div className={styles.empty}><FileCheck2 aria-hidden="true" /><h3>{query ? "Tidak ada artikel yang cocok" : scope === "review" ? "Antrian redaksi bersih" : "Belum ada tulisan"}</h3><p>{query ? "Coba kata kunci lain atau ubah filter status." : scope === "review" ? "Tidak ada tulisan penulis dengan status ini." : "Tulisan yang kamu buat akan muncul di sini."}</p>{scope === "mine" && <Link className="button primary" href="/dashboard/tulis">Tulis sekarang</Link>}</div>}
    </section>
    <nav className={styles.pagination} aria-label="Halaman tulisan">{page > 1 && <Link href={href(page - 1)}>← Sebelumnya</Link>}{(count ?? 0) > page * 20 && <Link href={href(page + 1)}>Berikutnya →</Link>}</nav>
  </div></AccountShell>;
}
