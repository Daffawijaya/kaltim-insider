import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { relative } from "@/lib/time";
import type { Story } from "@/lib/data";

type Row = { title: string; slug: string | null; excerpt: string | null; location: string | null; cover_url: string | null; is_advertorial: boolean | null; published_at: string | null; profiles: unknown; categories: unknown };

function mapStories(rows: Row[] | null): Story[] {
  return (rows ?? []).filter(row => row.slug).map(row => {
    const rawProfiles = row.profiles as unknown as { full_name?: string } | { full_name?: string }[] | null | undefined;
    const rawCategories = row.categories as unknown as { name?: string } | { name?: string }[] | null | undefined;
    const author = (Array.isArray(rawProfiles) ? rawProfiles[0]?.full_name : rawProfiles?.full_name) ?? "Redaksi";
    const category = (Array.isArray(rawCategories) ? rawCategories[0]?.name : rawCategories?.name) ?? "Olahraga";
    return { slug: row.slug!, title: row.title, excerpt: row.excerpt ?? "", category, location: row.location ?? "Kalimantan Timur", author, publishedAt: relative(row.published_at), image: row.cover_url ?? "/window.svg", advertorial: row.is_advertorial ?? false };
  });
}

// BBC Sport-style metadata: green category, grey relative time.
function SportMeta({ story }: { story: Story }) {
  return <span className="sport-meta"><span className="sport-meta-cat">{story.category}</span><span className="sport-meta-dot" aria-hidden="true">·</span><span className="sport-meta-time">{story.publishedAt}</span></span>;
}

// Image on top, headline below, green meta — card reused across the sport page.
function SportImageCard({ story, className = "" }: { story: Story; className?: string }) {
  return <article className={`sport-img-card ${className}`.trim()}>
    <Link className="sport-img-media" href={`/artikel/${story.slug}`} aria-label={story.title} tabIndex={-1}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={story.image} alt=""/>
    </Link>
    <Link href={`/artikel/${story.slug}`}><h3 className="sport-img-title">{story.title}</h3></Link>
    <SportMeta story={story}/>
  </article>;
}

export async function SportComposite() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("articles").select("title,slug,excerpt,location,cover_url,is_advertorial,published_at,profiles!articles_author_id_fkey(full_name),categories!inner(name,slug)").eq("status", "published").not("slug", "is", null).order("published_at", { ascending: false }).eq("categories.slug", "olahraga").range(0, 23);
  if (error) throw new Error("Berita belum dapat dimuat.");
  const stories = mapStories(data as Row[] | null);
  const lead = stories[0];
  if (!lead) return <div className="front-empty"><h2>Belum ada berita</h2><p>Berita kanal ini akan tampil setelah diterbitkan redaksi.</p></div>;

  const stack = stories.slice(1, 3);
  const texts = stories.slice(3, 7);
  const five = stories.slice(7, 12);
  const moreLead = stories[12];
  const moreCards = stories.slice(13, 19);

  return <>
    <h1 className="visually-hidden">Olahraga</h1>

    {/* Image 1 — hero: big lead left, two stacked image cards, text-only headlines, ad slot */}
    <section className="sport-hero" aria-label="Berita utama olahraga">
      <article className="sport-lead-card">
        <Link className="sport-img-media sport-lead-media" href={`/artikel/${lead.slug}`} aria-label={lead.title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lead.image} alt=""/>
        </Link>
        <Link href={`/artikel/${lead.slug}`}><h2 className="sport-lead-title">{lead.title}</h2></Link>
        {lead.excerpt && <p className="sport-lead-excerpt">{lead.excerpt}</p>}
        <SportMeta story={lead}/>
      </article>
      {stack.length > 0 && <div className="sport-hero-stack">
        {stack.map(story => <SportImageCard story={story} key={story.slug}/>)}
      </div>}
      {texts.length > 0 && <div className="sport-hero-list">
        {texts.map(story => <article className="sport-text-item" key={story.slug}>
          <Link href={`/artikel/${story.slug}`}><h3 className="sport-text-title">{story.title}</h3></Link>
          <SportMeta story={story}/>
        </article>)}
      </div>}
      <aside className="sport-ad" aria-label="Ruang iklan">
        <span className="sport-ad-label">Iklan</span>
        <div className="sport-ad-box" aria-hidden="true"><span>Ruang iklan</span></div>
      </aside>
    </section>

    {/* Image 2 — five-card image row */}
    {five.length > 0 && <section className="sport-five" aria-label="Berita olahraga terkini">
      <div className="sport-five-grid">
        {five.map(story => <SportImageCard story={story} key={story.slug} className="sport-five-card"/>)}
      </div>
    </section>}

    {/* Image 3 — "More sports news": large feature left, grid of small cards right */}
    {moreLead && <section className="sport-more" aria-label="Berita olahraga lainnya">
      <h2 className="sport-more-title">Berita olahraga lainnya</h2>
      <div className={`sport-more-grid${moreCards.length ? "" : " sport-more-grid--solo"}`}>
        <article className="sport-more-lead">
          <Link className="sport-img-media sport-more-lead-media" href={`/artikel/${moreLead.slug}`} aria-label={moreLead.title}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={moreLead.image} alt=""/>
          </Link>
          <Link href={`/artikel/${moreLead.slug}`}><h3 className="sport-more-lead-title">{moreLead.title}</h3></Link>
          {moreLead.excerpt && <p className="sport-more-excerpt">{moreLead.excerpt}</p>}
          <SportMeta story={moreLead}/>
        </article>
        {moreCards.length > 0 && <div className="sport-more-cards">
          {moreCards.map(story => <SportImageCard story={story} key={story.slug}/>)}
        </div>}
      </div>
    </section>}
  </>;
}
