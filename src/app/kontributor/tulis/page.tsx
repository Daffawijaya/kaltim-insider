import {notFound} from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ArticleEditor } from "@/components/article-editor";
import { AccountShell } from "@/components/account-shell";
import { requireUser } from "@/lib/dal";
import { isEditorialRole } from "@/lib/editorial";
import { createClient } from "@/lib/supabase/server";
import styles from "./write.module.css";

export default async function WritePage({ searchParams }: PageProps<"/kontributor/tulis">) {
  const profile = await requireUser();
  const { id } = await searchParams;
  const articleId = typeof id === "string" ? id : "";
  const supabase = await createClient();
  const [{ data: categories, error: categoriesError }, { data: draft, error: draftError }, { data: review, error: reviewError }] = await Promise.all([
    supabase.from("categories").select("id,name").order("name"),
    articleId ? supabase.from("articles").select("id,title,excerpt,body,location,category_id,cover_url,status").eq("id", articleId).eq("author_id", profile.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    articleId ? supabase.from("article_reviews").select("decision,note,created_at").eq("article_id", articleId).order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if(categoriesError||draftError||reviewError)throw new Error("Editor belum dapat dimuat.");
  if(articleId&&!draft)notFound();
  return <AccountShell role={profile.role} className={styles.page}><div className={styles.main}>
    <Link className={styles.back} href="/kontributor"><ChevronLeft size={20}/> Kembali ke Dashboard</Link>
    <div className={styles.title}><span aria-hidden="true"/><h1>{draft ? "Edit Artikel" : "Buat Artikel"}</h1></div>
    {review?.note && <div className="review-note"><strong>Catatan redaksi</strong><p>{review.note}</p></div>}
    {draft && !["draft", "revision"].includes(draft.status) ? <div className="notice">Tulisan sedang diproses redaksi dan belum dapat diedit.</div> : <ArticleEditor categories={categories ?? []} draft={draft ?? {}} authorName={profile.full_name} publishDirectly={isEditorialRole(profile.role)}/>}
  </div></AccountShell>;
}
