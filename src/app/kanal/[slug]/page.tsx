import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ImageCard, Headline, SectionTitle, Meta } from "@/components/front-story";
import { createClient } from "@/lib/supabase/server";
import { relative } from "@/lib/time";
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
  const stories: Story[] = (data ?? []).filter(article => article.slug).map(article => ({ slug: article.slug!, title: article.title, excerpt: article.excerpt ?? "", category: (article.categories as unknown as { name: string } | null)?.name ?? "Berita", location: article.location ?? "Kalimantan Timur", author: (article.profiles as unknown as { full_name: string } | null)?.full_name ?? "Redaksi", publishedAt: relative(article.published_at), image: article.cover_url ?? "/window.svg", advertorial: article.is_advertorial }));
  const title = category.name === "Terbaru" ? "Terbaru" : category.name;
  const lead = stories[0];
  const rail = stories.slice(1, 3);
  const latest = stories.slice(3, 9);
  const more = stories.slice(9);
  const pageLink = (target: number) => {
    const params = new URLSearchParams();
    if (String(lokasi).trim()) params.set("lokasi", String(lokasi).trim());
    params.set("page", String(target));
    return `/kanal/${slug}?${params}`;
  };
  return <>
    <SiteHeader/>
    <main className="front-page section-page">
      <div className="shell section-shell">
        <div className="section-head">
          <h1 className="kanal-title">{title}</h1>
          <form className="section-filter" role="search">
            <input type="text" name="lokasi" defaultValue={String(lokasi)} placeholder="Filter kabupaten/kota" aria-label="Filter lokasi"/>
            <button type="submit">Terapkan</button>
          </form>
        </div>

        {lead ? <>
          <section className="section-virginia" aria-label={`Berita utama ${title}`}>
            <article className={`section-lead${rail.length ? "" : " section-lead--full"}`}>
              <div className="section-lead-text">
                <h2><Link href={`/artikel/${lead.slug}`}>{lead.title}</Link></h2>
                {lead.excerpt && <p>{lead.excerpt}</p>}
                <Meta story={lead}/>
              </div>
              <Link className="section-lead-media" href={`/artikel/${lead.slug}`} tabIndex={-1} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lead.image} alt=""/>
              </Link>
            </article>
            {rail.length > 0 && <div className="section-rail">
              {rail.map(story => <ImageCard story={story} key={story.slug}/>)}
            </div>}
          </section>

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
