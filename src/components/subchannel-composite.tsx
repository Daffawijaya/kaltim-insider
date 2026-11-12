import Link from "next/link";
import { ImageCard, Headline } from "@/components/front-story";
import { createClient } from "@/lib/supabase/server";
import { relative } from "@/lib/time";
import type { Story } from "@/lib/data";

export type CompositeSection = { heading: string; slug: string; category: string | string[]; layout: "featured" | "two" | "three" | "list" };

type Row = { title: string; slug: string | null; excerpt: string | null; location: string | null; cover_url: string | null; is_advertorial: boolean | null; published_at: string | null; profiles: unknown; categories: unknown };

function section(heading: string, slug: string, stories: Story[], layout: CompositeSection["layout"]) {
  if (!stories.length) return null;
  const shown = stories.slice(0, layout === "list" ? 4 : layout === "two" ? 2 : 3);
  const head = <div className="front-section-title news-section-head"><h2>{heading}</h2><Link className="news-section-more" href={`/kanal/${slug}`}>Lihat semua <span aria-hidden="true">›</span></Link></div>;
  if (layout === "featured") return <section className="front-section news-section" aria-label={heading}>
    {head}
    <div className="news-featured"><ImageCard story={shown[0]} /><div className="news-featured-aside">{shown.slice(1).map(s => <Headline story={s} key={s.slug}/>)}</div></div>
  </section>;
  if (layout === "two") return <section className="front-section news-section" aria-label={heading}>
    {head}
    <div className="news-two">{shown.map(s => <ImageCard story={s} key={s.slug}/>)}</div>
  </section>;
  if (layout === "three") return <section className="front-section news-section" aria-label={heading}>
    {head}
    <div className="news-three">{shown.map(s => <ImageCard story={s} key={s.slug}/>)}</div>
  </section>;
  return <section className="front-section news-section" aria-label={heading}>
    {head}
    <div className="news-list">{shown.map(s => <Headline story={s} key={s.slug}/>)}</div>
  </section>;
}

export async function SubchannelComposite({ sections }: { sections: CompositeSection[] }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("articles").select("title,slug,excerpt,location,cover_url,is_advertorial,published_at,profiles!articles_author_id_fkey(full_name),categories(name,slug)").eq("status", "published").not("slug", "is", null).order("published_at", { ascending: false }).range(0, 99);
  if (error) throw new Error("Berita belum dapat dimuat.");
  const stories: Story[] = (data ?? []).map((row: Row) => {
    const rawProfiles = row.profiles as unknown as { full_name?: string } | { full_name?: string }[] | null | undefined;
    const rawCategories = row.categories as unknown as { name?: string } | { name?: string }[] | null | undefined;
    const author = (Array.isArray(rawProfiles) ? rawProfiles[0]?.full_name : rawProfiles?.full_name) ?? "Redaksi";
    const category = (Array.isArray(rawCategories) ? rawCategories[0]?.name : rawCategories?.name) ?? "Berita";
    return { slug: row.slug!, title: row.title, excerpt: row.excerpt ?? "", category, location: row.location ?? "Kalimantan Timur", author, publishedAt: relative(row.published_at), image: row.cover_url ?? "/window.svg", advertorial: row.is_advertorial ?? false };
  });
  const byCat = (names: string | string[]) => {
    const list = Array.isArray(names) ? names : [names];
    return stories.filter(s => list.includes(s.category));
  };
  return <div className="news-composite composite-page">
    {sections.map(s => section(s.heading, s.slug, byCat(s.category), s.layout))}
  </div>;
}
