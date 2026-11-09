import Link from "next/link";
import { ArrowDownUp, Bell, BookOpen, CalendarDays, ChevronRight, Eye, FileText, PenLine, Search, Settings, Sparkles, Trophy, Users, MoreVertical } from "lucide-react";
import { DashboardImage } from "@/components/dashboard-image";
import { AccountShell } from "@/components/account-shell";
import { markNotificationsRead } from "@/app/actions/notifications";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { articleStatuses, isEditorialRole } from "@/lib/editorial";
import { contributorParams, contributorTabs, contributorArticleSearch } from "@/lib/contributor";
import styles from "./dashboard.module.css";
import queue from "../redaksi/queue.module.css";

const labels = { draft: "Draf", submitted: "Menunggu", revision: "Perlu revisi", approved: "Disetujui", published: "Terbit", rejected: "Ditolak", archived: "Arsip" };
const ownStatuses = ["draft", "published", "archived"] as const;
const reviewStatuses = ["submitted", "revision", "published", "rejected", "archived"] as const;
const date = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Makassar" }).format(new Date(value));
const number = (value: number) => new Intl.NumberFormat("id-ID").format(value);
const compact = (value: number) => new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value);

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
  const { tab, page, status, scope: requestedScope } = contributorParams(params);
  const editorial = isEditorialRole(profile.role);
  const scope = editorial ? (params.scope === undefined ? "review" : requestedScope) : "mine";
  const availableStatuses = editorial ? scope === "review" ? reviewStatuses : ownStatuses : articleStatuses;
  const activeStatus = availableStatuses.find(value => value === status) ?? (scope === "review" ? "submitted" : undefined);
  const { query, pattern, oldest } = contributorArticleSearch(params);
  const supabase = await createClient();
  const count = () => supabase.from("articles").select("id", { count: "exact", head: true }).eq("author_id", profile.id);
  const publicArticles = () => supabase.from("articles").select("id,title,slug,cover_url,published_at,view_count,categories(name)").eq("status", "published").not("slug", "is", null);
  let articleQuery = scope === "review"
    ? supabase.from("articles").select("id,title,slug,status,location,cover_url,created_at,updated_at,submitted_at,view_count,categories(name),profiles!articles_author_id_fkey!inner(full_name,role)", { count: "exact" }).eq("profiles.role", "contributor").neq("author_id", profile.id)
    : supabase.from("articles").select("id,title,slug,status,location,cover_url,created_at,updated_at,submitted_at,view_count,categories(name),profiles!articles_author_id_fkey(full_name,role)", { count: "exact" }).eq("author_id", profile.id);
  if (activeStatus) articleQuery = articleQuery.eq("status", activeStatus);
  if (query) articleQuery = articleQuery.ilike("title", pattern);
  const [published, articles, notifications, recent, featured, popular, views] = await Promise.all([
    count().eq("status", "published"),
    tab === "artikel" ? articleQuery.order(scope === "review" ? "submitted_at" : "updated_at", { ascending: oldest }).order("id").range((page - 1) * 20, page * 20 - 1) : Promise.resolve(null),
    tab === "notifikasi" ? supabase.from("notifications").select("id,article_id,title,message,read_at,created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(50) : Promise.resolve(null),
    publicArticles().order("published_at", { ascending: false }).limit(1),
    publicArticles().eq("is_featured", true).order("published_at", { ascending: false }).limit(1),
    publicArticles().gt("view_count", 0).order("view_count", { ascending: false }).order("id").limit(4),
    // shortcut: jumlahkan baris di server aplikasi; ganti RPC agregasi jika satu penulis dapat memiliki ribuan artikel.
    supabase.from("articles").select("view_count").eq("author_id", profile.id).eq("status", "published"),
  ]);
  const totalViews = views.error ? null : (views.data ?? []).reduce((total, article) => total + article.view_count, 0);
  const articleHref = (nextPage = 1, nextStatus: string = activeStatus ?? "") => {
    const search = new URLSearchParams({ tab: "artikel", page: String(nextPage) });
    if (editorial) search.set("scope", scope);
    if (nextStatus) search.set("status", nextStatus);
    if (query) search.set("q", query);
    if (oldest) search.set("order", "oldest");
    return `/kontributor?${search}#dashboard-panel`;
  };
  const role = profile.role === "admin" ? "Administrator" : profile.role === "editor" ? "Redaktur" : "Penulis";
  return <AccountShell role={profile.role} className={styles.dashboard}>
    <div className={styles.main}>
      <div className={styles.layout}>
        <div className={styles.content}>
          <section className={styles.profile} aria-labelledby="profile-heading">
            <div className={styles.avatar}><DashboardImage src={profile.avatar_url || "/default-profile.jpeg"} /></div>
            <div className={styles.profileCopy}><span className="kicker">{role}</span><h1 id="profile-heading">{profile.full_name}</h1><Link className={styles.profileGear} href="/kontributor/profil" aria-label="Pengaturan profil"><Settings size={19} aria-hidden="true" /></Link></div>
              <div className={styles.profileStats}><span><FileText size={16} aria-hidden="true" /> Terbit: <strong>{published.error ? "Belum tersedia" : number(published.count ?? 0)}</strong></span><span aria-hidden="true">|</span><span><Eye size={16} aria-hidden="true" /> Tayangan: <strong>{totalViews === null ? "Belum tersedia" : compact(totalViews)}</strong></span></div>
              <p className={styles.bio}>{profile.bio || `Berbagi kabar dan cerita dari ${profile.city || "Kalimantan Timur"}.`}</p>
              <div className={styles.actions}><Link className="button primary" href="/kontributor/tulis"><PenLine size={18} aria-hidden="true" /> Tulis Artikel</Link><Link className="button" href="/kontributor/profil">Edit Profil<ChevronRight size={16} aria-hidden="true" /></Link></div>
          </section>

          <section className={styles.panel} id="dashboard-panel" aria-label="Aktivitas penulis">
            <nav className={styles.tabs} aria-label="Bagian dashboard">{Object.entries(contributorTabs).map(([key, label]) => <Link key={key} href={`/kontributor?tab=${key}#dashboard-panel`} aria-current={tab === key ? "page" : undefined}>{label}</Link>)}</nav>
            <div className={styles.panelBody}>
              {tab === "notifikasi" && <><div className={styles.notificationHeading}>{!!notifications?.data?.some(item => !item.read_at) && <form action={markNotificationsRead}><button className="button">Tandai sudah dibaca</button></form>}</div>
                {notifications?.error ? <p className={styles.quiet} role="status">Notifikasi belum dapat dimuat. Silakan coba lagi nanti.</p> : notifications?.data?.length ? <><div className={styles.notifications}>{notifications.data.map(item => <Link key={item.id} href={item.article_id ? `/kontributor/tulis?id=${item.article_id}` : "/kontributor/notifikasi"} className={`${styles.notification} ${!item.read_at ? styles.unread : ""}`}><Bell size={18} aria-hidden="true" /><div><strong>{item.title}</strong>{!item.read_at && <span className={styles.newLabel}>Belum dibaca</span>}<p>{item.message}</p><time dateTime={item.created_at}>{date(item.created_at)}</time></div><ChevronRight size={16} aria-hidden="true" /></Link>)}</div><Link className={styles.more} href="/kontributor/notifikasi">Lihat halaman notifikasi <ChevronRight size={15} aria-hidden="true" /></Link></> : <div className={styles.empty}><DashboardImage src="/dashboard-empty.svg" className={styles.emptyArt} /><h3>Belum ada notifikasi</h3><p>Kabar dan catatan dari redaksi akan muncul di sini.</p></div>}
              </>}
              {tab === "artikel" && <>
                <div className={queue.filterBar}>
                  <nav className={styles.filters} aria-label="Filter status tulisan">{scope === "mine" && <Link href={articleHref(1, "")} aria-current={!activeStatus ? "page" : undefined}>Semua</Link>}{availableStatuses.map(value => <Link href={articleHref(1, value)} aria-current={activeStatus === value ? "page" : undefined} key={value}>{labels[value]}</Link>)}</nav>
                  {editorial && <nav className={queue.scopeTabs} aria-label="Ruang kelola artikel"><Link href="/kontributor?tab=artikel&scope=review&status=submitted#dashboard-panel" aria-current={scope === "review" ? "page" : undefined}>Antrian Redaksi</Link><Link href="/kontributor?tab=artikel&scope=mine#dashboard-panel" aria-current={scope === "mine" ? "page" : undefined}>Tulisan Saya</Link></nav>}
                </div>
                <div className={queue.tools}><form action="/kontributor#dashboard-panel"><input type="hidden" name="tab" value="artikel" />{editorial && <input type="hidden" name="scope" value={scope} />}{activeStatus && <input type="hidden" name="status" value={activeStatus} />}<input type="hidden" name="order" value={oldest ? "oldest" : "newest"} /><label><span className={queue.srOnly}>Cari judul artikel</span><input name="q" defaultValue={query} placeholder="Cari artikel" maxLength={100} /><button type="submit" aria-label="Cari artikel"><Search aria-hidden="true" /></button></label></form><Link className={queue.order} href={`/kontributor?tab=artikel${editorial ? `&scope=${scope}` : ""}${activeStatus ? `&status=${activeStatus}` : ""}&order=${oldest ? "newest" : "oldest"}${query ? `&q=${encodeURIComponent(query)}` : ""}#dashboard-panel`} aria-label={oldest ? "Urutkan terbaru" : "Urutkan terlama"}><ArrowDownUp aria-hidden="true" /></Link></div>
                {articles?.error ? <p className={styles.quiet} role="status">Tulisan belum dapat dimuat. Silakan coba lagi nanti.</p> : articles?.data?.length ? <div className={queue.list}>{articles.data.map(article => { const articleLink = scope === "review" ? `/redaksi/${article.id}` : `/kontributor/tulis?id=${article.id}`; const author = (article.profiles as unknown as { full_name: string } | null)?.full_name; return <article className={queue.item} key={article.id}>{article.cover_url ? <DashboardImage src={article.cover_url} className={queue.image} /> : <div className={queue.fallback}><FileText size={24} aria-hidden="true" /></div>}<div className={queue.copy}><div className={queue.meta}><span className={`${queue.status} ${queue[article.status]}`}>{labels[article.status as keyof typeof labels]}</span><time dateTime={article.created_at}>{scope === "review" && article.submitted_at ? `Dikirim ${date(article.submitted_at)}` : `Dibuat ${date(article.created_at)}`}</time></div><h3><Link href={articleLink}>{article.title || "Tanpa judul"}</Link></h3><p>{scope === "review" && `${author ?? "Penulis"} · `}{(article.categories as unknown as { name: string } | null)?.name ?? "Tanpa kategori"}{article.location && ` · ${article.location}`} · Diperbarui {date(article.updated_at)}{article.status === "published" && ` · ${number(article.view_count)} tayangan`}</p></div><details className={queue.menu}><summary aria-label={`Aksi untuk ${article.title || "tulisan"}`}><MoreVertical size={21} /></summary><div><Link href={articleLink}>{scope === "review" ? "Periksa tulisan" : "Buka tulisan"}</Link>{article.status === "published" && article.slug && <Link href={`/artikel/${article.slug}`}>Lihat artikel terbit</Link>}</div></details></article>})}</div> : <div className={styles.empty}><FileText size={40} aria-hidden="true" /><h3>{query ? "Tidak ada artikel yang cocok" : scope === "review" ? "Antrian redaksi bersih" : activeStatus ? "Belum ada tulisan dengan status ini" : "Belum ada tulisan"}</h3><p>{query ? "Coba kata kunci lain atau ubah filter status." : scope === "review" ? "Tidak ada tulisan penulis dengan status ini." : "Mulai dari kabar penting di sekitarmu."}</p>{scope === "mine" && <Link className="button primary" href="/kontributor/tulis">Tulis sekarang</Link>}</div>}
                {!articles?.error && <nav className={styles.pagination} aria-label="Halaman tulisan">{page > 1 && <Link href={articleHref(page - 1)}>← Sebelumnya</Link>}{(articles?.count ?? 0) > page * 20 && <Link href={articleHref(page + 1)}>Berikutnya →</Link>}</nav>}
              </>}
              {tab === "kegiatan" && <><h2>Event menulis</h2><div className={styles.empty}><CalendarDays size={40} aria-hidden="true" /><h3>Lihat event yang tersedia</h3><p>Gabung event lebih dulu agar dapat dipilih saat menulis artikel.</p><Link className="button primary" href="/kontributor/kegiatan">Buka Event</Link></div></>}
              {tab === "panduan" && <><div className={styles.panelHeading}><div><h2>Panduan & FAQ</h2><p>Kenali alur tulisanmu di Kaltim Insider.</p></div><BookOpen size={24} aria-hidden="true" /></div><div className={styles.faq}>
                <details open><summary>Bagaimana mulai menulis?</summary><p>Pilih <Link href="/kontributor/tulis">Tulis Artikel</Link>, isi informasi tulisan, lalu simpan sebagai draf untuk dilanjutkan.</p></details>
                <details><summary>{editorial ? "Bagaimana menerbitkan tulisan?" : "Bagaimana mengirim tulisan ke redaksi?"}</summary><p>{editorial ? "Lengkapi kolom yang wajib diisi di editor, lalu pilih Terbitkan. Tulisan Anda akan langsung tampil sebagai artikel terbit." : "Lengkapi kolom yang wajib diisi di editor, lalu gunakan aksi kirim untuk mengajukan tulisan kepada redaksi. Tulisan yang sedang diproses belum dapat diedit."}</p></details>
                <details><summary>Di mana saya melihat status tulisan?</summary><p>Buka <Link href="/kontributor?tab=artikel#dashboard-panel">Kelola Artikel</Link>. {editorial ? "Tulisan yang Anda terbitkan akan tampil di daftar ini." : "Gunakan filter status untuk melihat draf, tulisan dalam proses, atau tulisan yang telah terbit."}</p></details>
                <details><summary>Apa yang dilakukan jika perlu revisi?</summary><p>Buka tulisan berstatus “Perlu revisi”, baca catatan redaksi di editor, perbaiki tulisan, lalu kirim kembali.</p></details>
                <details><summary>Bagaimana memperbarui profil?</summary><p>Buka <Link href="/kontributor/profil">Pengaturan Profil</Link> untuk memperbarui nama, username, kota, avatar, dan bio.</p></details>
              </div></>}
            </div>
          </section>
        </div>

        <aside className={styles.sidebar} aria-label="Kabar dan inspirasi komunitas">
          <section className={styles.sideSection}><div className={styles.sideHeading}><h2>Kabar Redaksi</h2><FileText size={20} aria-hidden="true" /></div><p className={styles.caption}>Kabar terbaru yang telah diterbitkan.</p><ArticleList articles={(recent.data ?? []) as unknown as SidebarArticle[]} error={!!recent.error} empty="Belum ada kabar yang diterbitkan." /></section>
          <section className={styles.sideSection}><div className={styles.sideHeading}><h2>Penulis Teratas</h2><Trophy size={20} aria-hidden="true" /></div><div className={styles.smallEmpty}><Users size={28} aria-hidden="true" /><p>Peringkat penulis belum tersedia.</p><span>Terus berbagi cerita yang berarti untuk pembaca.</span></div></section>
          <section className={`${styles.sideSection} ${styles.spotlight}`}><div className={styles.sideHeading}><h2>Sorotan Penulis</h2><Sparkles size={20} aria-hidden="true" /></div><div className={styles.spotlightBanner} aria-hidden="true"><Trophy size={42} /><strong>KARYA PILIHAN</strong><span>Cerita terbaik dari komunitas</span><Sparkles size={24} /></div><p className={styles.caption}>Pilihan redaksi dari artikel yang telah terbit.</p><ArticleList articles={(featured.data ?? []) as unknown as SidebarArticle[]} error={!!featured.error} empty="Belum ada karya yang disorot redaksi." /></section>
          <section className={styles.sideSection}><div className={styles.sideHeading}><h2>Artikel Populer</h2><Eye size={20} aria-hidden="true" /></div><p className={styles.caption}>Berdasarkan total tayangan sepanjang waktu.</p><ArticleList articles={(popular.data ?? []) as unknown as SidebarArticle[]} error={!!popular.error} empty="Artikel populer belum tersedia." showViews /></section>
        </aside>
      </div>
    </div>
  </AccountShell>;
}
