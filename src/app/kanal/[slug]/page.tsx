import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ImageCard, Headline, SectionTitle, Meta } from "@/components/front-story";
import { NewsComposite } from "@/components/news-composite";
import { createClient } from "@/lib/supabase/server";
import { relative } from "@/lib/time";
import type { Story } from "@/lib/data";

type CategoryResult = { id?: string | number; name: string; ids?: string[] } | null;

const getCategory = cache(async (slug: string): Promise<CategoryResult> => {
  if (slug === "terbaru" || slug === "news") return { id: undefined, name: "News" };
  const supabase = await createClient();
  if (slug === "bisnis" || slug === "gaya-hidup") {
    const children = slug === "bisnis"
      ? ["bisnis", "umkm", "industri", "pasar", "ikn"]
      : ["gaya-hidup", "kuliner", "wisata", "fashion", "hiburan"];
    const { data: rows, error: errorIds } = await supabase.from("categories").select("id,slug,name").in("slug", children);
    if (errorIds || !rows?.length) throw new Error("Kanal belum dapat dimuat.");
    const parent = rows.find(row => row.slug === slug);
    return { id: undefined, name: parent?.name ?? (slug === "bisnis" ? "Bisnis" : "Gaya Hidup"), ids: rows.map(row => String(row.id)) };
  }
  const { data, error } = await supabase.from("categories").select("id,name").eq("slug", slug).maybeSingle();
  if (error) throw new Error("Kanal belum dapat dimuat.");
  return data ? { id: data.id, name: data.name } : null;
});

export async function generateMetadata({ params, searchParams }: PageProps<"/kanal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { page: rawPage = "1" } = await searchParams;
  const category = await getCategory(slug);
  if (!category) return {};
  const page = Math.max(1, Number(rawPage) || 1);
  const name = `Berita ${category.name} Kaltim`;
  const description = `${name} dan Kalimantan Timur terbaru, akurat, serta relevan dari Kaltim Insider.`;
  const canonical = `/kanal/${slug}${page > 1 ? `?page=${page}` : ""}`;
  return { title: page > 1 ? `${name} - Halaman ${page}` : name, description, alternates: { canonical }, openGraph: { title: name, description, url: canonical } };
}

export default async function ChannelPage({ params, searchParams }: PageProps<"/kanal/[slug]">) {
  const { slug } = await params;
  const { page: rawPage = "1" } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const category = await getCategory(slug);
  if (!category) notFound();
  const from = (page - 1) * 12;
  const supabase = await createClient();
  let query = supabase.from("articles").select("title,slug,excerpt,location,cover_url,is_advertorial,published_at,profiles!articles_author_id_fkey(full_name),categories(name)", { count: "exact" }).eq("status", "published").order("published_at", { ascending: false }).range(from, from + 11);
  if (category.ids) query = query.in("category_id", category.ids);
  else if (category.id) query = query.eq("category_id", category.id);
  const { data, count, error } = await query;
  if (error) throw new Error("Berita belum dapat dimuat.");
  const stories: Story[] = (data ?? []).filter(article => article.slug).map(article => ({ slug: article.slug!, title: article.title, excerpt: article.excerpt ?? "", category: (article.categories as unknown as { name: string } | null)?.name ?? "Berita", location: article.location ?? "Kalimantan Timur", author: (article.profiles as unknown as { full_name: string } | null)?.full_name ?? "Redaksi", publishedAt: relative(article.published_at), image: article.cover_url ?? "/window.svg", advertorial: article.is_advertorial }));
  const title = category.name === "Terbaru" ? "News" : category.name;
  const lead = stories[0];
  const rail = stories.slice(1, 3);
  const latest = stories.slice(3, 9);
  const more = stories.slice(9);
  const pageLink = (target: number) => `/kanal/${slug}?page=${target}`;
  const isNews = slug === "news" || ["daerah","ekonomi","pendidikan","kesehatan","teknologi","lingkungan","wisata-budaya"].includes(slug);
  return <>
    <SiteHeader/>
    <main className={isNews && slug === "news" ? "front-page section-page section-news" : "front-page section-page"}>
      <div className="shell section-shell section-arts">

        {slug === "news" ? <NewsComposite /> : lead ? <>
          {" " /* sub-channel pages keep their previous layout */}
          {isNews ? (
            <section className="news-virginia" aria-label={`Berita utama ${title}`}>
              <article className="news-london">
                <div className="news-london-text">
                  <h2><Link href={`/artikel/${lead.slug}`}>{lead.title}</Link></h2>
                  {lead.excerpt && <p>{lead.excerpt}</p>}
                  <Meta story={lead}/>
                </div>
                <Link className="news-london-media" href={`/artikel/${lead.slug}`} aria-label={lead.title}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lead.image} alt=""/>
                </Link>
              </article>
              {rail.length > 0 && <div className="news-dundee">
                {rail.map(story => <ImageCard story={story} key={story.slug} />)}
              </div>}
            </section>
          ) : (
            <section className="arts-hero" aria-label={`Berita utama ${title}`}>
              <Link className="arts-hero-media" href={`/artikel/${lead.slug}`} aria-label={lead.title}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lead.image} alt=""/>
              </Link>
              <div className="arts-hero-text">
                <h2><Link href={`/artikel/${lead.slug}`}>{lead.title}</Link></h2>
                {lead.excerpt && <p>{lead.excerpt}</p>}
                <Meta story={lead}/>
              </div>
            </section>
          )}

          {latest.length > 0 && <section className="front-section" aria-label={`Terbaru di ${title}`}>
            <SectionTitle>Terbaru di {title}</SectionTitle>
            <div className="front-latest-grid">{latest.map(story => <ImageCard story={story} key={story.slug}/>)}</div>
          </section>}

          {more.length > 0 && <section className="front-section" aria-label="Lainnya">
            <SectionTitle>Lainnya</SectionTitle>
            <div className="front-channel-headlines">{more.map(story => <Headline story={story} key={story.slug}/>)}</div>
          </section>}

          <nav className="section-pagination" aria-label="Halaman kanal">
            {page > 1 && <Link href={pageLink(page - 1)}>← Sebelumnya</Link>}
            {(count ?? 0) > page * 12 && <Link href={pageLink(page + 1)}>Berikutnya →</Link>}
          </nav>
        </> : <div className="front-empty"><h2>Belum ada berita</h2><p>Berita kanal ini akan tampil setelah diterbitkan redaksi.</p></div>}
      </div>
    </main>
    <SiteFooter/>
  </>;
}
