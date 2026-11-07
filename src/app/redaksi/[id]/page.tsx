import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountShell } from "@/components/account-shell";
import { ReviewForm } from "@/components/review-form";
import { RichTextContent } from "@/components/rich-text-content";
import { splitArticleContent } from "@/lib/article-content";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import styles from "./review.module.css";

export default async function ReviewPage({ params }: PageProps<"/redaksi/[id]">) {
  const profile = await requireRole(["editor", "admin"]);
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: article, error: articleError }, { data: history, error: historyError }] = await Promise.all([
    supabase.from("articles").select("id,title,excerpt,body,location,cover_url,status,is_advertorial,submitted_at,profiles!articles_author_id_fkey(full_name),categories(name)").eq("id", id).maybeSingle(),
    supabase.from("article_reviews").select("id,decision,note,created_at").eq("article_id", id).order("created_at", { ascending: false }),
  ]);
  if (articleError || historyError) throw new Error("Pemeriksaan belum dapat dimuat.");
  if (!article) notFound();

  const content = splitArticleContent(article.body);
  const category = (article.categories as unknown as { name: string } | null)?.name ?? "Tanpa kanal";
  const author = (article.profiles as unknown as { full_name: string } | null)?.full_name ?? "Penulis";

  return <AccountShell role={profile.role} className={styles.page}>
    <div className={styles.heading}><Link href="/redaksi">← Kembali ke antrean</Link><h1>Pemeriksaan Artikel</h1><p>Periksa isi dan tentukan kelayakan tulisan.</p></div>
    <div className={styles.layout}>
      <article className={styles.document}>
        <div className={styles.eyebrow}>{category} · {article.location || "Kalimantan Timur"} · {author}</div>
        <h2>{article.title || "Tanpa judul"}</h2>
        {article.excerpt && <p className={styles.deck}>{article.excerpt}</p>}
        {article.cover_url && /* eslint-disable-next-line @next/next/no-img-element */ <img className={styles.hero} src={article.cover_url} alt="" />}
        <RichTextContent value={content.body} className={styles.body} />
        {content.blocks.map(block => <section className={styles.body} key={block.id}><h3>{block.subtitle}</h3>{block.image_url && /* eslint-disable-next-line @next/next/no-img-element */ <img className={styles.hero} src={block.image_url} alt={block.subtitle} />}<RichTextContent value={block.body} /></section>)}
      </article>
      <aside className={styles.sidebar}>
        <section className={styles.sideCard}><h2>Keputusan</h2><ReviewForm key={`${article.status}-${article.is_advertorial}`} id={article.id} status={article.status} advertorial={article.is_advertorial} expanded /></section>
        <section className={styles.sideCard}><h2>Riwayat</h2>{history?.length ? history.map(item => <div className={styles.history} key={item.id}><strong>{item.decision}</strong><time dateTime={item.created_at}>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(new Date(item.created_at))}</time>{item.note && <p>{item.note}</p>}</div>) : <p className={styles.muted}>Belum ada keputusan.</p>}</section>
      </aside>
    </div>
  </AccountShell>;
}
