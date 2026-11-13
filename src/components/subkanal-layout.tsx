import Link from "next/link";
import { ImageCard, Headline, SectionTitle, Meta } from "@/components/front-story";
import type { Story } from "@/lib/data";

// Sub-kanal pages all share the same design vocabulary as the rest of the site,
// only the arrangement differs per section (layouting only).
export type HeroKind = "virginia" | "top" | "split" | "editorial" | "overlay";
export type LatestKind = "grid3" | "grid2" | "list" | "featured-aside";
export type MoreKind = "headlines" | "cards";
export type SubkanalVariant = { hero: HeroKind; latest: LatestKind; more: MoreKind };

function HeroVirginia({ lead, rail, title }: { lead: Story; rail: Story[]; title: string }) {
  return <section className="news-virginia" aria-label={`Berita utama ${title}`}>
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
    {rail.length > 0 && <div className="news-dundee">{rail.map(story => <ImageCard story={story} key={story.slug}/>)}</div>}
  </section>;
}

function HeroTop({ lead, title }: { lead: Story; title: string }) {
  return <section className="lead-top" aria-label={`Berita utama ${title}`}>
    <Link className="lead-top-media" href={`/artikel/${lead.slug}`} aria-label={lead.title}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={lead.image} alt=""/>
    </Link>
    <div className="lead-top-body">
      <h2 className="lead-top-title"><Link href={`/artikel/${lead.slug}`}>{lead.title}</Link></h2>
      {lead.excerpt && <p className="lead-top-excerpt">{lead.excerpt}</p>}
      <Meta story={lead}/>
    </div>
  </section>;
}

function HeroSplit({ lead, title }: { lead: Story; title: string }) {
  return <section className="lead-split" aria-label={`Berita utama ${title}`}>
    <Link className="lead-split-media" href={`/artikel/${lead.slug}`} aria-label={lead.title}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={lead.image} alt=""/>
    </Link>
    <div className="lead-split-text">
      <h2 className="lead-split-title"><Link href={`/artikel/${lead.slug}`}>{lead.title}</Link></h2>
      {lead.excerpt && <p className="lead-split-excerpt">{lead.excerpt}</p>}
      <Meta story={lead}/>
    </div>
  </section>;
}

function HeroEditorial({ lead, title }: { lead: Story; title: string }) {
  return <section className="lead-editorial" aria-label={`Berita utama ${title}`}>
    <span className="kicker">{lead.category}</span>
    <h2 className="lead-editorial-title"><Link href={`/artikel/${lead.slug}`}>{lead.title}</Link></h2>
    {lead.excerpt && <p className="lead-editorial-excerpt">{lead.excerpt}</p>}
    <Meta story={lead}/>
    <Link className="lead-editorial-media" href={`/artikel/${lead.slug}`} aria-label={lead.title}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={lead.image} alt=""/>
    </Link>
  </section>;
}

function HeroOverlay({ lead, title }: { lead: Story; title: string }) {
  return <section className="arts-hero" aria-label={`Berita utama ${title}`}>
    <Link className="arts-hero-media" href={`/artikel/${lead.slug}`} aria-label={lead.title}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={lead.image} alt=""/>
    </Link>
    <div className="arts-hero-text">
      <h2><Link href={`/artikel/${lead.slug}`}>{lead.title}</Link></h2>
      {lead.excerpt && <p>{lead.excerpt}</p>}
      <Meta story={lead}/>
    </div>
  </section>;
}

function Latest({ kind, stories, title }: { kind: LatestKind; stories: Story[]; title: string }) {
  if (!stories.length) return null;
  if (kind === "list") return <section className="front-section" aria-label={`Terbaru di ${title}`}>
    <SectionTitle>Terbaru di {title}</SectionTitle>
    <div className="news-list news-list--two">{stories.map(story => <Headline story={story} key={story.slug}/>)}</div>
  </section>;
  if (kind === "featured-aside") {
    const [feature, ...aside] = stories;
    if (!aside.length) return <section className="front-section" aria-label={`Terbaru di ${title}`}>
      <SectionTitle>Terbaru di {title}</SectionTitle>
      <div className="news-featured news-featured--solo"><ImageCard story={feature}/></div>
    </section>;
    return <section className="front-section" aria-label={`Terbaru di ${title}`}>
      <SectionTitle>Terbaru di {title}</SectionTitle>
      <div className="news-featured"><ImageCard story={feature}/><div className="news-featured-aside">{aside.slice(0, 3).map(story => <Headline story={story} key={story.slug}/>)}</div></div>
    </section>;
  }
  return <section className="front-section" aria-label={`Terbaru di ${title}`}>
    <SectionTitle>Terbaru di {title}</SectionTitle>
    <div className={`front-latest-grid${kind === "grid2" ? " front-latest-grid--two" : ""}`}>{stories.map(story => <ImageCard story={story} key={story.slug}/>)}</div>
  </section>;
}

function More({ kind, stories }: { kind: MoreKind; stories: Story[] }) {
  if (!stories.length) return null;
  return <section className="front-section" aria-label="Lainnya">
    <SectionTitle>Lainnya</SectionTitle>
    {kind === "headlines"
      ? <div className="front-channel-headlines">{stories.map(story => <Headline story={story} key={story.slug}/>)}</div>
      : <div className="front-latest-grid">{stories.map(story => <ImageCard story={story} key={story.slug}/>)}</div>}
  </section>;
}

export function SubkanalSections({ variant, stories, title }: { variant: SubkanalVariant; stories: Story[]; title: string }) {
  const lead = stories[0];
  if (!lead) return <div className="front-empty"><h2>Belum ada berita</h2><p>Berita kanal ini akan tampil setelah diterbitkan redaksi.</p></div>;
  const rail = variant.hero === "virginia" ? stories.slice(1, 3) : [];
  const offset = variant.hero === "virginia" ? 3 : 1;
  const latest = stories.slice(offset, offset + 6);
  const more = stories.slice(offset + 6, offset + 10);
  return <>
    {variant.hero === "virginia" && <HeroVirginia lead={lead} rail={rail} title={title}/>}
    {variant.hero === "top" && <HeroTop lead={lead} title={title}/>}
    {variant.hero === "split" && <HeroSplit lead={lead} title={title}/>}
    {variant.hero === "editorial" && <HeroEditorial lead={lead} title={title}/>}
    {variant.hero === "overlay" && <HeroOverlay lead={lead} title={title}/>}
    <Latest kind={variant.latest} stories={latest} title={title}/>
    <More kind={variant.more} stories={more}/>
  </>;
}
