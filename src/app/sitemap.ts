import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { legalPages } from "@/lib/legal";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const supabase = await createClient();
  const { data, error } = await supabase.from("articles").select("slug,updated_at,cover_url,profiles!articles_author_id_fkey(username),categories(slug)").eq("status", "published").not("slug", "is", null).order("updated_at", { ascending: false });
  if (error) throw new Error("Sitemap belum dapat dimuat.");
  const articles = data ?? [];
  const newest = articles[0]?.updated_at ? new Date(articles[0].updated_at) : undefined;
  const channels = new Set<string>(["news", "bisnis", "gaya-hidup"]);
  const authors = new Map<string, Date>();
  for (const article of articles) {
    const category = article.categories as unknown as { slug: string } | null;
    const author = article.profiles as unknown as { username: string | null } | null;
    if (category?.slug) channels.add(category.slug);
    if (author?.username && !authors.has(author.username)) authors.set(author.username, new Date(article.updated_at));
  }
  return [
    { url: base, lastModified: newest, changeFrequency: "hourly", priority: 1 },
    ...[...channels].map(slug => ({ url: `${base}/kanal/${slug}`, lastModified: newest, changeFrequency: "hourly" as const, priority: .8 })),
    ...articles.map(article => ({ url: `${base}/artikel/${article.slug}`, lastModified: new Date(article.updated_at), changeFrequency: "daily" as const, priority: .9, images: article.cover_url ? [article.cover_url] : undefined })),
    ...[...authors].map(([username, lastModified]) => ({ url: `${base}/penulis/${username}`, lastModified, changeFrequency: "weekly" as const, priority: .6 })),
    ...Object.keys(legalPages).map(page => ({ url: `${base}/${page}`, changeFrequency: "yearly" as const, priority: page === "tentang" ? .5 : .3 })),
  ];
}
