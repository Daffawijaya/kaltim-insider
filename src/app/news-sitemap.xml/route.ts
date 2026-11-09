import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { xmlEscape } from "@/lib/seo";

export const revalidate = 300;

export async function GET() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from("articles").select("slug,title,published_at").eq("status", "published").gte("published_at", since).not("slug", "is", null).order("published_at", { ascending: false }).limit(1000);
  if (error) return new Response("News sitemap unavailable", { status: 503 });
  const base = getSiteUrl();
  const urls = (data ?? []).map(article => `<url><loc>${xmlEscape(`${base}/artikel/${article.slug}`)}</loc><news:news><news:publication><news:name>Kaltim Insider</news:name><news:language>id</news:language></news:publication><news:publication_date>${xmlEscape(article.published_at)}</news:publication_date><news:title>${xmlEscape(article.title)}</news:title></news:news></url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls}</urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
