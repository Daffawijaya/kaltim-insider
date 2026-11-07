import Link from "next/link";
import { Bell, BookOpen, CalendarDays, ChevronRight, Eye, FileText, PenLine, Search, Settings, Sparkles, Trophy, Users, MoreVertical } from "lucide-react";
import { DashboardImage } from "@/components/dashboard-image";
import { AccountShell } from "@/components/account-shell";
import { markNotificationsRead } from "@/app/actions/notifications";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { articleStatuses } from "@/lib/editorial";
import { contributorParams, contributorTabs, contributorArticleSearch } from "@/lib/contributor";
import styles from "./dashboard.module.css";

const labels = { draft: "Draf", submitted: "Menunggu", revision: "Perlu revisi", approved: "Disetujui", published: "Terbit", rejected: "Ditolak", archived: "Arsip" };
const date = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Makassar" }).format(new Date(value));
const number = (value: number) => new Intl.NumberFormat("id-ID").format(value);

type SidebarArticle = { id: string; title: string; slug: string; cover_url: string | null; published_at: string | null; view_count: number; categories: { name: string } | null };
function ArticleList({ articles, error, empty, showViews = false }: { articles: SidebarArticle[]; error: boolean; empty: string; showViews?: boolean }) {
  if (error) return <p className={styles.quiet} role="status">Konten belum dapat dimuat. Silakan coba lagi nanti.</p>;
  if (!articles.length) return <p className={styles.quiet}>{empty}</p>;
  return <div className={styles.stories}>{articles.map(article => <article className={styles.story} key={article.id}>
    {article.cover_url && <Link href={`/artikel/${article.slug}`} tabIndex={-1} aria-hidden="true" className={styles.thumbnail}><DashboardImage src={article.cover_url} /></Link>}
    <div><span className="kicker">{article.categories?.name ?? "Berita"}</span><h3><Link href={`/artikel/${article.slug}`}>{article.title}</Link></h3>
      <p>{article.published_at && <time dateTime={article.published_at}>{date(article.published_at)} · WITA</time>}{showViews && <span className={styles.views}><Eye size={14} aria-hidden="true" /> {number(article.view_count)} tayangan</span>}</p>
    </div>
  </article>)}</div>;
}

export default async function Contributor({ searchParams }: PageProps<"/kontributor">) {
  const profile = await requireUser();
  const params = await searchParams;
  const { tab, page, status } = contributorParams(params);
  const { query, pattern, oldest } = contributorArticleSearch(params);
  const supabase = await createClient();
  const count = () => supabase.from("articles").select("id", { count: "exact", head: true }).eq("author_id", profile.id);
  const publicArticles = () => supabase.from("articles").select("id,title,slug,cover_url,published_at,view_count,categories(name)").eq("status", "published").not("slug", "is", null);
  let articleQuery = supabase.from("articles").select("id,title,slug,status,location,cover_url,created_at,updated_at,view_count,categories(name)", { count: "exact" }).eq("author_id", profile.id);
  if (status) articleQuery = articleQuery.eq("status", status);
  if (query) articleQuery = articleQuery.ilike("title", pattern);
  const [total, published, revision, progress, articles, notifications, recent, featured, popular, views] = await Promise.all([
    count(), count().eq("status", "published"), count().eq("status", "revision"), count().in("status", ["submitted", "approved"]),
    tab === "artikel" ? articleQuery.order("updated_at", { ascending: oldest }).order("id").range((page - 1) * 20, page * 20 - 1) : Promise.resolve(null),
    tab === "notifikasi" ? supabase.from("notifications").select("id,article_id,title,message,read_at,created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(50) : Promise.resolve(null),
    publicArticles().order("published_at", { ascending: false }).limit(1),
    publicArticles().eq("is_featured", true).order("published_at", { ascending: false }).limit(1),
    publicArticles().gt("view_count", 0).order("view_count", { ascending: false }).order("id").limit(4),
    // shortcut: total tayangan memerlukan agregasi PostgREST; tampilkan status belum tersedia jika agregasi dinonaktifkan, gunakan RPC saat tersedia.
    supabase.from("articles").select("view_count.sum()").eq("author_id", profile.id).eq("status", "published").maybeSingle(),
  ]);
  const stats = [
    ["Total tulisan", total], ["Telah terbit", published], ["Dalam proses", progress], ["Perlu revisi", revision],
  ] as const;
  const articleHref = (nextPage = 1, nextStatus: string = status ?? "") => {
    const search = new URLSearchParams({ tab: "artikel", page: String(nextPage) });
    if (nextStatus) search.set("status", nextStatus);
    if (query) search.set("q", query);
    if (oldest) search.set("order", "oldest");
    return `/kontributor?${search}#dashboard-panel`;
  };
  const role = profile.role === "admin" ? "Administrator" : profile.role === "editor" ? "Redaktur" : "Kontributor";
  const publicProfile = profile.username ? `/penulis/${encodeURIComponent(profile.username)}` : "/kontributor/profil";
  return <AccountShell role={profile.role} className={styles.dashboard}>
    <div className={styles.main}>
      <div className={styles.layout}>
        <div className={styles.content}>
          <section className={styles.profile} aria-labelledby="profile-heading">
            <div className={styles.avatar}>{profile.avatar_url ? <DashboardImage src={profile.avatar_url} /> : <span>{profile.full_name?.trim().charAt(0).toUpperCase() || "K"}</span>}</div>
            <div className={styles.profileCopy}><span className="kicker">{role}</span><h1 id="profile-heading">{profile.full_name}</h1>
              <div className={styles.profileStats}><span><FileText size={16} aria-hidden="true" /> Terbit: <strong>{published.error ? "Belum tersedia" : number(published.count ?? 0)}</strong></span><span><Eye size={16} aria-hidden="true" /> Tayangan: <strong>{views.error ? "Belum tersedia" : number(views.data?.sum ?? 0)}</strong></span></div>
              <p className={styles.bio}>{profile.bio || `Berbagi kabar dan cerita dari ${profile.city || "Kalimantan Timur"}.`}</p>
              <div className={styles.actions}><Link className="button primary" href="/kontributor/tulis"><PenLine size={18} aria-hidden="true" /> Tulis Artikel</Link><Link className="button" href={publicProfile}>{profile.username ? "Lihat Profil" : "Lengkapi Profil"}<ChevronRight size={16} aria-hidden="true" /></Link></div>
            </div>
            <Link href="/kontributor/profil" className={styles.settings} aria-label="Pengaturan profil"><Settings size={21} /></Link>
          </section>

          <section className={styles.hub} aria-labelledby="hub-heading"><div className={styles.hubMark} aria-hidden="true"><PenLine /></div><h2 id="hub-heading">Pusat Kontributor</h2><p>Mulai cerita baru, kelola tulisan, dan ikuti kabar dari redaksi Kaltim Insider dalam satu ruang.</p><Link className="button" href="/kontributor?tab=artikel#dashboard-panel">Kelola Tulisan Saya <ChevronRight size={16} aria-hidden="true" /></Link></section>

          <section className={styles.panel} id="dashboard-panel" aria-label="Aktivitas kontributor">
            <nav className={styles.tabs} aria-label="Bagian dashboard">{Object.entries(contributorTabs).map(([key, label]) => <Link key={key} href={`/kontributor?tab=${key}#dashboard-panel`} aria-current={tab === key ? "page" : undefined}>{label}</Link>)}</nav>
            <div className={styles.panelBody}>
              {tab === "notifikasi" && <><div className={styles.notificationHeading}>{!!notifications?.data?.some(item => !item.read_at) && <form action={markNotificationsRead}><button className="button">Tandai sudah dibaca</button></form>}</div>
                {notifications?.error ? <p className={styles.quiet} role="status">Notifikasi belum dapat dimuat. Silakan coba lagi nanti.</p> : notifications?.data?.length ? <><div className={styles.notifications}>{notifications.data.map(item => <Link key={item.id} href={item.article_id ? `/kontributor/tulis?id=${item.article_id}` : "/kontributor/notifikasi"} className={`${styles.notification} ${!item.read_at ? styles.unread : ""}`}><Bell size={18} aria-hidden="true" /><div><strong>{item.title}</strong>{!item.read_at && <span className={styles.newLabel}>Belum dibaca</span>}<p>{item.message}</p><time dateTime={item.created_at}>{date(item.created_at)}</time></div><ChevronRight size={16} aria-hidden="true" /></Link>)}</div><Link className={styles.more} href="/kontributor/notifikasi">Lihat halaman notifikasi <ChevronRight size={15} aria-hidden="true" /></Link></> : <div className={styles.empty}><DashboardImage src="/dashboard-empty.svg" className={styles.emptyArt} /><h3>Belum ada notifikasi</h3><p>Kabar dan catatan dari redaksi akan muncul di sini.</p></div>}
              </>}
              {tab === "artikel" && <>
                <nav className={styles.filters} aria-label="Filter status tulisan"><Link href={articleHref(1, "")} aria-current={!status ? "page" : undefined}>Semua</Link>{articleStatuses.map(value => <Link href={articleHref(1, value)} aria-current={status === value ? "page" : undefined} key={value}>{labels[value]}</Link>)}</nav>
                <form className={styles.searchForm} action="/kontributor#dashboard-panel"><input type="hidden" name="tab" value="artikel" />{status && <input type="hidden" name="status" value={status} />}<label className={styles.searchInput}><span className={styles.srOnly}>Cari judul artikel</span><input name="q" defaultValue={query} placeholder="Cari artikel" maxLength={100} /><button type="submit" aria-label="Cari artikel"><Search size={21} /></button></label><label><span className={styles.srOnly}>Urutan artikel</span><select name="order" defaultValue={oldest ? "oldest" : "newest"}><option value="newest">Terbaru</option><option value="oldest">Terlama</option></select></label><button className={styles.sortButton} type="submit">Urutkan</button></form>
                {articles?.error ? <p className={styles.quiet} role="status">Tulisan belum dapat dimuat. Silakan coba lagi nanti.</p> : articles?.data?.length ? <div className={styles.submissions}>{articles.data.map(article => <article className={styles.submission} key={article.id}>{article.cover_url ? <DashboardImage src={article.cover_url} className={styles.submissionImage} /> : <div className={styles.coverFallback}><FileText size={24} aria-hidden="true" /></div>}<div><span className={`status ${article.status === "published" ? "published" : article.status === "revision" ? "revision" : article.status === "rejected" ? "rejected" : "review"}`}>{labels[article.status as keyof typeof labels]}</span><p>Dibuat {date(article.created_at)}</p><h3><Link href={`/kontributor/tulis?id=${article.id}`}>{article.title || "Tanpa judul"}</Link></h3><p>{(article.categories as unknown as { name: string } | null)?.name ?? "Tanpa kategori"}{article.location && ` · ${article.location}`}</p><time dateTime={article.updated_at}>Diperbarui {date(article.updated_at)}</time>{article.status === "published" && <p className={styles.views}><Eye size={16} aria-hidden="true" /> {number(article.view_count)} tayangan</p>}</div><details className={styles.articleMenu}><summary aria-label={`Aksi untuk ${article.title || "tulisan"}`}><MoreVertical size={21} /></summary><div><Link href={`/kontributor/tulis?id=${article.id}`}>Buka tulisan</Link>{article.status === "published" && article.slug && <Link href={`/artikel/${article.slug}`}>Lihat artikel terbit</Link>}</div></details></article>)}</div> : <div className={styles.empty}><FileText size={40} aria-hidden="true" /><h3>{query ? "Tidak ada artikel yang cocok" : status ? "Belum ada tulisan dengan status ini" : "Belum ada tulisan"}</h3><p>{query ? "Coba kata kunci lain atau ubah filter status." : "Mulai dari kabar penting di sekitarmu."}</p><Link className="button primary" href="/kontributor/tulis">Tulis sekarang</Link></div>}
                {!articles?.error && <nav className={styles.pagination} aria-label="Halaman tulisan">{page > 1 && <Link href={articleHref(page - 1)}>← Sebelumnya</Link>}{(articles?.count ?? 0) > page * 20 && <Link href={articleHref(page + 1)}>Berikutnya →</Link>}</nav>}
                <details className={styles.statsDetails}><summary>Ringkasan tulisan</summary><div className={styles.stats}>{stats.map(([label, result]) => <div key={label}><span>{label}</span><strong>{result.error ? "—" : number(result.count ?? 0)}</strong></div>)}</div>
          {stats.some(([, result]) => result.error) && <p className={styles.quiet} role="status">Sebagian statistik belum dapat dimuat.</p>}</details>
              </>}
              {tab === "kegiatan" && <><h2>Kegiatan komunitas</h2><div className={styles.empty}><CalendarDays size={40} aria-hidden="true" /><h3>Belum ada kegiatan</h3><p>Informasi kegiatan kontributor akan ditampilkan saat tersedia.</p></div></>}
              {tab === "panduan" && <><div className={styles.panelHeading}><div><h2>Panduan & FAQ</h2><p>Kenali alur tulisanmu di Kaltim Insider.</p></div><BookOpen size={24} aria-hidden="true" /></div><div className={styles.faq}>
                <details open><summary>Bagaimana mulai menulis?</summary><p>Pilih <Link href="/kontributor/tulis">Tulis Artikel</Link>, isi informasi tulisan, lalu simpan sebagai draf untuk dilanjutkan.</p></details>
                <details><summary>Bagaimana mengirim tulisan ke redaksi?</summary><p>Lengkapi kolom yang wajib diisi di editor, lalu gunakan aksi kirim untuk mengajukan tulisan kepada redaksi. Tulisan yang sedang diproses belum dapat diedit.</p></details>
                <details><summary>Di mana saya melihat status tulisan?</summary><p>Buka <Link href="/kontributor?tab=artikel#dashboard-panel">Kelola Artikel</Link>. Gunakan filter status untuk melihat draf, tulisan dalam proses, atau tulisan yang telah terbit.</p></details>
                <details><summary>Apa yang dilakukan jika perlu revisi?</summary><p>Buka tulisan berstatus “Perlu revisi”, baca catatan redaksi di editor, perbaiki tulisan, lalu kirim kembali.</p></details>
                <details><summary>Bagaimana memperbarui profil?</summary><p>Buka <Link href="/kontributor/profil">Pengaturan Profil</Link> untuk memperbarui nama, username, kota, avatar, dan bio.</p></details>
              </div></>}
            </div>
          </section>
        </div>

        <aside className={styles.sidebar} aria-label="Kabar dan inspirasi komunitas">
          <section className={styles.sideSection}><div className={styles.sideHeading}><h2>Kabar Redaksi</h2><FileText size={20} aria-hidden="true" /></div><p className={styles.caption}>Kabar terbaru yang telah diterbitkan.</p><ArticleList articles={(recent.data ?? []) as unknown as SidebarArticle[]} error={!!recent.error} empty="Belum ada kabar yang diterbitkan." /></section>
          <section className={styles.sideSection}><div className={styles.sideHeading}><h2>Kontributor Teratas</h2><Trophy size={20} aria-hidden="true" /></div><div className={styles.smallEmpty}><Users size={28} aria-hidden="true" /><p>Peringkat kontributor belum tersedia.</p><span>Terus berbagi cerita yang berarti untuk pembaca.</span></div></section>
          <section className={`${styles.sideSection} ${styles.spotlight}`}><div className={styles.sideHeading}><h2>Sorotan Kontributor</h2><Sparkles size={20} aria-hidden="true" /></div><div className={styles.spotlightBanner} aria-hidden="true"><Trophy size={42} /><strong>KARYA PILIHAN</strong><span>Cerita terbaik dari komunitas</span><Sparkles size={24} /></div><p className={styles.caption}>Pilihan redaksi dari artikel yang telah terbit.</p><ArticleList articles={(featured.data ?? []) as unknown as SidebarArticle[]} error={!!featured.error} empty="Belum ada karya yang disorot redaksi." /></section>
          <section className={styles.sideSection}><div className={styles.sideHeading}><h2>Artikel Populer</h2><Eye size={20} aria-hidden="true" /></div><p className={styles.caption}>Berdasarkan total tayangan sepanjang waktu.</p><ArticleList articles={(popular.data ?? []) as unknown as SidebarArticle[]} error={!!popular.error} empty="Artikel populer belum tersedia." showViews /></section>
        </aside>
      </div>
    </div>
  </AccountShell>;
}
