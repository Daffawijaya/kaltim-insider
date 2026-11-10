import type {Metadata} from "next";
import Link from "next/link";
import {SiteFooter} from "@/components/site-footer";
import {SiteHeader} from "@/components/site-header";
import {ImageCard,Headline,SectionTitle,Meta} from "@/components/front-story";
import {relative} from "@/lib/time";
import {type Story} from "@/lib/data";
import {getPublishedArticles} from "@/lib/dal";

export const metadata:Metadata={
  title:{absolute:"Berita Kaltim Terkini & Kalimantan Timur | Kaltim Insider"},
  description:"Berita Kaltim terkini dan kabar terbaru Kalimantan Timur: daerah, ekonomi, pendidikan, kesehatan, teknologi, lingkungan, budaya, olahraga, dan opini.",
  alternates:{canonical:"/"},
  openGraph:{title:"Berita Kaltim Terkini & Kalimantan Timur",description:"Kabar terbaru dan cerita warga dari seluruh Kalimantan Timur.",url:"/"},
};

export default async function Home(){
  const published=await getPublishedArticles();
  const live:Story[]=published.map(article=>({
    slug:article.slug,
    title:article.title,
    excerpt:article.excerpt,
    category:article.categories?.name??"Berita",
    location:article.location,
    author:article.profiles?.full_name??"Redaksi Kaltim Insider",
    publishedAt:relative(article.published_at),
    image:article.cover_url??"/window.svg",
    featured:article.is_featured,
    advertorial:article.is_advertorial,
  }));

  if(!live.length)return <><SiteHeader/><main className="shell listing-page empty-state"><h1>Belum ada berita</h1><p>Berita akan tampil setelah diterbitkan oleh redaksi.</p></main><SiteFooter/></>;

  const featured=live.find(story=>story.featured)??live[0];
  const feed=[featured,...live.filter(story=>story.slug!==featured.slug)];
  const at=(index:number)=>feed[index%feed.length];

  return <>
    <SiteHeader/>
    <main className="bbc-home front-page">
      <section className="shell front-top-grid" aria-label="Berita utama">
        <div className="front-side-stack">
          <ImageCard story={at(1)}/>
          <ImageCard story={at(2)}/>
        </div>

        <article className="front-lead">
          <Link href={`/artikel/${featured.slug}`} className="front-lead-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={featured.image} alt=""/>
          </Link>
          <Link href={`/artikel/${featured.slug}`}><h1>{featured.title}</h1></Link>
          <p>{featured.excerpt}</p>
          <Meta story={featured}/>
          <div className="front-related">
            {[at(3),at(4),at(5)].map((story,index)=><Link href={`/artikel/${story.slug}`} key={`${story.slug}-related-${index}`}>{story.title}</Link>)}
          </div>
        </article>

        <div className="front-headlines">
          {[at(3),at(4),at(5),at(6)].map((story,index)=><Headline story={story} key={`${story.slug}-headline-${index}`}/>) }
        </div>
      </section>

      <section className="shell front-section">
        <SectionTitle>Pilihan Kaltim Insider</SectionTitle>
        <div className="front-editorial-grid">
          <ImageCard story={at(7)}/>
          <ImageCard story={at(8)}/>
        </div>
      </section>

      <section className="shell front-section">
        <SectionTitle>Berita terbaru</SectionTitle>
        <div className="front-latest-grid">
          {[at(9),at(10),at(11),at(12),at(13),at(14)].map((story,index)=><ImageCard story={story} key={`${story.slug}-latest-${index}`}/>) }
        </div>
      </section>

      <section className="shell front-section front-channel-section">
        <SectionTitle>Kalimantan Timur</SectionTitle>
        <div className="front-channel-grid">
          <ImageCard story={at(15)} className="front-channel-lead"/>
          <div className="front-channel-headlines">
            {[at(16),at(17),at(18),at(19)].map((story,index)=><Headline story={story} key={`${story.slug}-channel-${index}`}/>) }
          </div>
        </div>
      </section>
    </main>
    <SiteFooter/>
  </>;
}
