"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireUser } from "@/lib/dal";
import type { ArticleStatus } from "@/lib/editorial";
import { articleContentImages, joinArticleContent, type ArticleContentBlock, type ArticleImageMeta } from "@/lib/article-content";
import { articleImagePath, staleArticleImage, validWebP } from "@/lib/images";
import { richTextPlainText } from "@/lib/rich-text";
import { sanitizeRichText } from "@/lib/rich-text.server";

export type ArticleState = { error?: string; success?: string; id?: string; categoryId?: number | null; coverUrl?: string; blockUrls?: Record<string, string> };

function articleInput(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    body: sanitizeRichText(String(formData.get("body") ?? "").trim()),
    location: String(formData.get("location") ?? "").trim(),
    cover_url: String(formData.get("cover_url") ?? "").trim() || null,
    category_id: Number(formData.get("category_id")) || null,
  };
}

function imageMetaInput(value: unknown): ArticleImageMeta {
  const meta = value as Partial<ArticleImageMeta> | null;
  const result = {
    caption: String(meta?.caption ?? "").trim(),
  };
  if (result.caption.length > 500) throw new Error();
  return result;
}

function contentBlockInput(formData: FormData) {
  const raw = String(formData.get("content_blocks") ?? "[]");
  if (raw.length > 200_000) throw new Error();
  const value = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > 20) throw new Error();
  const seen = new Set<string>();
  return value.map((block): Omit<ArticleContentBlock, "image_url"> => {
    const id = String(block?.id ?? "");
    const subtitle = String(block?.subtitle ?? "").trim();
    const body = sanitizeRichText(String(block?.body ?? "").trim());
    if (!/^[a-f0-9-]{36}$/i.test(id) || seen.has(id) || subtitle.length > 140 || body.length > 100_000) throw new Error();
    seen.add(id);
    return { id, subtitle, body, image_meta: imageMetaInput(block?.image_meta) };
  });
}

function completeImageMeta(meta: ArticleImageMeta) {
  return Boolean(meta.caption);
}

function validateArticle(input: ReturnType<typeof articleInput>, coverMeta: ArticleImageMeta, blocks: ArticleContentBlock[]) {
  if (input.title.length < 12) return "Judul minimal 12 karakter.";
  if (input.excerpt.length < 30) return "Ringkasan minimal 30 karakter.";
  if ([input.body, ...blocks.map(block => block.body)].map(value => richTextPlainText(value)).join(" ").length < 200) return "Isi berita minimal 200 karakter.";
  if (!input.category_id || !input.location) return "Kategori dan lokasi wajib diisi.";
  if (!input.cover_url) return "Foto utama wajib diunggah.";
  if (!completeImageMeta(coverMeta)) return "Lengkapi keterangan dan sumber gambar utama.";
  if (blocks.some(block => block.subtitle.length < 3 || richTextPlainText(block.body).length < 30 || !block.image_url || !completeImageMeta(block.image_meta))) return "Lengkapi subjudul, gambar, informasi gambar, dan isi pada setiap konten tambahan.";
  return null;
}

async function cleanupOrphanedImages(supabase: Awaited<ReturnType<typeof createClient>>, owner: string) {
  const { data: articles, error: articleError } = await supabase.from("articles").select("cover_url,body").eq("author_id", owner);
  if (articleError) return console.error("Referensi gambar belum dapat diperiksa; pembersihan dilewati.");
  const referenced = new Set((articles ?? []).flatMap(article => [article.cover_url, ...articleContentImages(article.body)]).filter(Boolean));
  const bucket = supabase.storage.from("article-images");
  const orphaned: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await bucket.list(owner, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) return console.error("Daftar gambar belum dapat diperiksa; pembersihan dilewati.");
    for (const object of data) {
      const path = `${owner}/${object.name}`;
      if (staleArticleImage(object) && !referenced.has(bucket.getPublicUrl(path).data.publicUrl)) orphaned.push(path);
    }
    if (data.length < 100) break;
  }
  if (!orphaned.length) return;
  const { error } = await bucket.remove(orphaned);
  if (error) console.error("Sebagian gambar yatim belum dapat dibersihkan dari article-images.");
}

export async function saveArticle(_: ArticleState, formData: FormData): Promise<ArticleState> {
  const profile = await requireUser();
  const supabase = await createClient();
  const input = articleInput(formData);
  let blockInput: ReturnType<typeof contentBlockInput>;
  let coverMeta: ArticleImageMeta;
  try {
    blockInput = contentBlockInput(formData);
    coverMeta = imageMetaInput(JSON.parse(String(formData.get("cover_meta") ?? "{}")));
  } catch { return { error: "Informasi gambar atau konten tambahan tidak valid. Muat ulang editor lalu coba lagi." }; }
  const intent = String(formData.get("intent") ?? "draft");
  const id = String(formData.get("id") ?? "");
  const { data: existing, error: readError } = id ? await supabase.from("articles").select("cover_url,body,status").eq("id", id).eq("author_id", profile.id).maybeSingle() : { data: null, error: null };
  if (readError || (id && (!existing || !["draft", "revision"].includes(existing.status)))) return { error: "Tulisan tidak tersedia untuk diedit. Muat ulang dashboard.", id };
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (input.cover_url && !articleImagePath(input.cover_url, origin, profile.id)) return { error: "Gunakan foto dari unggahan akun Anda.", id };
  const file = formData.get("cover_file");
  const uploads: { path: string; file: File }[] = [];
  if (file instanceof File && file.size > 0) {
    if (!await validWebP(file)) return { error: "Foto harus berupa WebP 1024 × 576 yang valid, maksimal 5 MB.", id };
    const path = `${profile.id}/${crypto.randomUUID()}.webp`;
    uploads.push({ path, file });
    input.cover_url = supabase.storage.from("article-images").getPublicUrl(path).data.publicUrl;
  }
  const blocks: ArticleContentBlock[] = [];
  for (const block of blockInput) {
    const blockFile = formData.get(`block_file_${block.id}`);
    let imageUrl = String(formData.get(`block_url_${block.id}`) ?? "").trim() || null;
    if (imageUrl && !articleImagePath(imageUrl, origin, profile.id)) return { error: "Gunakan gambar konten dari unggahan akun Anda.", id };
    if (blockFile instanceof File && blockFile.size > 0) {
      if (!await validWebP(blockFile)) return { error: "Gambar konten harus berupa WebP 1024 × 576 yang valid, maksimal 5 MB.", id };
      const path = `${profile.id}/${crypto.randomUUID()}.webp`;
      uploads.push({ path, file: blockFile });
      imageUrl = supabase.storage.from("article-images").getPublicUrl(path).data.publicUrl;
    }
    blocks.push({ ...block, image_url: imageUrl });
  }
  if (intent === "submit") {
    const invalid = validateArticle(input, coverMeta, blocks);
    if (invalid) return { error: invalid, id: id || undefined };
  }
  for (const upload of uploads) {
    const { error } = await supabase.storage.from("article-images").upload(upload.path, upload.file, { contentType: "image/webp", upsert: false });
    if (error) {
      await supabase.storage.from("article-images").remove(uploads.map(item => item.path));
      return { error: "Gambar belum dapat diunggah. Coba lagi.", id };
    }
  }
  const payload = { ...input, body: joinArticleContent(input.body, blocks, coverMeta), status: intent === "submit" ? "submitted" : "draft", submitted_at: intent === "submit" ? new Date().toISOString() : null };
  const query = id
    ? supabase.from("articles").update(payload).eq("id", id).eq("author_id", profile.id).in("status", ["draft", "revision"]).select("id,category_id").single()
    : supabase.from("articles").insert({ ...payload, author_id: profile.id }).select("id,category_id").single();
  const { data, error } = await query;
  if (error) {
    if (uploads.length) {
      const cleanup = await supabase.storage.from("article-images").remove(uploads.map(item => item.path));
      if (cleanup.error) console.error("Pembersihan unggahan gagal; periksa bucket article-images.");
    }
    return { error: "Tulisan belum tersimpan. Periksa data atau muat ulang untuk melihat status terbaru.", id: id || undefined };
  }
  const oldImages = new Set(existing ? [existing.cover_url, ...articleContentImages(existing.body)].filter(Boolean) : []);
  const newImages = new Set([input.cover_url, ...blocks.map(block => block.image_url)].filter(Boolean));
  const replaced = [...oldImages].filter(url => !newImages.has(url)).map(url => articleImagePath(String(url), origin, profile.id)).filter((path): path is string => Boolean(path));
  if (replaced.length) {
    const cleanup = await supabase.storage.from("article-images").remove(replaced);
    if (cleanup.error) console.error("Gambar lama belum dapat dibersihkan dari article-images.");
  }
  // shortcut: cleanup runs on article saves; add a scheduled worker if another upload path is introduced.
  await cleanupOrphanedImages(supabase, profile.id);
  revalidatePath("/kontributor");
  if (intent === "submit") redirect("/kontributor?sent=1");
  return { success: "Draft tersimpan.", id: data.id, categoryId: data.category_id, coverUrl: input.cover_url ?? "", blockUrls: Object.fromEntries(blocks.flatMap(block => block.image_url ? [[block.id, block.image_url]] : [])) };
}

export async function reviewArticle(_: ArticleState, formData: FormData): Promise<ArticleState> {
  await requireRole(["editor", "admin"]);
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "") as ArticleStatus;
  const note = String(formData.get("note") ?? "").trim();
  if (!id || !["revision", "approved", "published", "rejected", "archived"].includes(decision)) return { error: "Pilih keputusan yang valid." };
  if (["revision", "rejected"].includes(decision) && note.length < 10) return { error: "Catatan revisi atau penolakan minimal 10 karakter." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_article", { target_id: id, next_status: decision, expected_status: String(formData.get("expected_status") ?? ""), review_note: note || null, advertorial: formData.get("advertorial") === "on" });
  if (error) return { error: error.code === "40001" ? "Status telah berubah karena keputusan editor lain. Muat ulang halaman sebelum memutuskan kembali." : "Keputusan belum tersimpan. Periksa status dan catatan lalu coba lagi." };
  revalidatePath("/redaksi");
  revalidatePath("/kontributor");
  revalidatePath("/");
  revalidatePath(`/redaksi/${id}`);
  revalidatePath("/artikel", "layout");
  return { success: "Keputusan tersimpan." };
}
