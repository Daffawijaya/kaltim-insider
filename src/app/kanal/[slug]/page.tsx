import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StoryCard } from "@/components/story-card";
import { createClient } from "@/lib/supabase/server";
import type { Story } from "@/lib/data";

const getCategory = cache(async (slug: string) => {
  if (slug === "terbaru") return { id: undefined, name: "Terbaru" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id,name").eq("slug", slug).maybeSingle();
  if (error) throw new Error("Kanal belum dapat dimuat.");
  return data;
});

export async function generateMetadata({ params, searchParams }: PageProps<"/kanal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { page: rawPage = "1", lokasi = "" } = await searchParams;
  const category = await getCategory(slug);
  if (!category) return {};
  const page = Math.max(1, Number(rawPage) || 1);
  const location = String(lokasi).trim();
  const name = category.name === "Terbaru" ? "Berita Kaltim Terkini" : `Berita ${category.name} Kaltim`;
  const description = `${name} dan Kalimantan Timur terbaru, akurat, serta relevan dari Kaltim Insider.`;
  const canonical = `/kanal/${slug}${page > 1 ? `?page=${page}` : ""}`;
  return { title: page > 1 ? `${name} - Halaman ${page}` : name, description, alternates: { canonical }, robots: location ? { index: false, follow: true } : { index: true, follow: true }, openGraph: { title: name, description, url: canonical } };
}

export default async function ChannelPage({ params, searchParams }: PageProps<"/kanal/[slug]">) {
  const { slug } = await params;
  const { page: rawPage = "1", lokasi = "" } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const category = await getCategory(slug);
  if (!category) notFound();
  const from = (page - 1) * 12;
  const supabase = await createClient();
  let query = supabase.from("articles").select("title,slug,excerpt,location,cover_url,is_advertorial,published_at,profiles!articles_author_id_fkey(full_name),categories(name)", { count: "exact" }).eq("status", "published").order("published_at", { ascending: false }).range(from, from + 11);
  if (category.id) query = query.eq("category_id", category.id);
  if (String(lokasi)) query = query.ilike("location", `%${String(lokasi)}%`);
  const { data, count, error } = await query;
  if (error) throw new Error("Berita belum dapat dimuat.");
  const stories: Story[] = (data ?? []).filter(article => article.slug).map(article => ({ slug: article.slug!, title: article.title, excerpt: article.excerpt ?? "", category: (article.categories as unknown as { name: string } | null)?.name ?? "Berita", location: article.location ?? "Kalimantan Timur", author: (article.profiles as unknown as { full_name: string } | null)?.full_name ?? "Redaksi", publishedAt: article.published_at ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(article.published_at)) : "", image: article.cover_url ?? "/window.svg", advertorial: article.is_advertorial }));
  return <><SiteHeader/><main className="shell listing-page"><div className="listing-head"><span className="kicker">Kanal Berita Kalimantan Timur</span><h1>{category.name === "Terbaru" ? "Berita Kaltim Terkini" : `${category.name} Kalimantan Timur`}</h1><p>Kabar terbaru {category.name.toLowerCase()} dari seluruh wilayah Kalimantan Timur.</p><form><input name="lokasi" defaultValue={String(lokasi)} placeholder="Filter kabupaten/kota"/><button className="button">Terapkan</button></form></div><div className="latest-grid">{stories.map(story => <StoryCard story={story} key={story.slug}/>)}</div>{!stories.length && <div className="empty-state"><h2>Belum ada berita</h2></div>}<nav className="pagination">{page > 1 && <Link href={`/kanal/${slug}?page=${page - 1}&lokasi=${encodeURIComponent(String(lokasi))}`}>← Sebelumnya</Link>}{(count ?? 0) > page * 12 && <Link href={`/kanal/${slug}?page=${page + 1}&lokasi=${encodeURIComponent(String(lokasi))}`}>Berikutnya →</Link>}</nav></main><SiteFooter/></>;
}
