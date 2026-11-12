import Link from "next/link";
import { Meta } from "@/components/front-story";
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

export async function SportComposite() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("articles").select("title,slug,excerpt,location,cover_url,is_advertorial,published_at,profiles!articles_author_id_fkey(full_name),categories!inner(name,slug)").eq("status", "published").not("slug", "is", null).order("published_at", { ascending: false }).eq("categories.slug", "olahraga").range(0, 23);
  if (error) throw new Error("Berita belum dapat dimuat.");
  const stories = mapStories(data as Row[] | null);
  const lead = stories[0];
  const rest = stories.slice(1);
  const list = rest.slice(0, 9);
  const aside = rest.slice(9, 12);
  return <>
    {lead && <article className="sport-lead" aria-label="Berita utama">
      <div className="sport-lead-text">
        <h2><Link href={`/artikel/${lead.slug}`}>{lead.title}</Link></h2>
        {lead.excerpt && <p>{lead.excerpt}</p>}
        <Meta story={lead}/>
      </div>
      <Link className="sport-lead-media" href={`/artikel/${lead.slug}`} aria-label={lead.title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lead.image} alt=""/>
      </Link>
    </article>}
    <div className="sport-grid">
      <div className="sport-list" aria-label="Berita lainnya">
        {list.map(s => <article key={s.slug} className="sport-promo">
          <div className="sport-promo-text">
            <h3><Link href={`/artikel/${s.slug}`}>{s.title}</Link></h3>
            {s.excerpt && <p>{s.excerpt}</p>}
            <Meta story={s}/>
          </div>
          <Link className="sport-promo-media" href={`/artikel/${s.slug}`} aria-label={s.title}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.image} alt=""/>
          </Link>
        </article>)}
      </div>
      {aside.length > 0 && <aside className="sport-aside" aria-label="Sorotan olahraga">
        <h2 className="sport-aside-title">Sorotan</h2>
        {aside.map((s, index) => <article className="sport-aside-card" key={s.slug}>
          <div className="sport-aside-num">{index + 2}</div>
          <div>
            <h3><Link href={`/artikel/${s.slug}`}>{s.title}</Link></h3>
            <Meta story={s}/>
          </div>
        </article>)}
      </aside>}
    </div>
  </>;
}
