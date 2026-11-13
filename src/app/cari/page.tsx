import type { Metadata } from "next"; import Link from "next/link"; import { X, Search, ChevronLeft, ChevronRight } from "lucide-react"; import { SiteHeader } from "@/components/site-header"; import { SiteFooter } from "@/components/site-footer"; import { createClient } from "@/lib/supabase/server"; import type { Story } from "@/lib/data";

export const metadata:Metadata={title:"Cari Berita Kaltim",description:"Cari berita dan kabar terbaru Kalimantan Timur di Kaltim Insider.",robots:{index:false,follow:true},alternates:{canonical:"/cari"}};

function pageWindow(total:number, current:number):Array<number|"…">{
  if(total<=7)return Array.from({length:total},(_,i)=>i+1);
  const kept=new Set<number>([1,2,current-1,current,current+1,total-1,total]);
  const sorted=[...kept].filter(p=>p>=1&&p<=total).sort((a,b)=>a-b);
  const out:Array<number|"…">=[];
  for(let i=0;i<sorted.length;i++){
    if(i>0&&sorted[i]-sorted[i-1]>1)out.push("…");
    out.push(sorted[i]);
  }
  return out;
}

export default async function SearchPage({ searchParams }: PageProps<"/cari">) { const { q = "", page: rawPage = "1" } = await searchParams; const term=String(q).trim(); const page=Math.max(1,Number(rawPage)||1); const supabase=await createClient(); const from=(page-1)*12; let results:Story[]=[]; let count=0;
  if(term){const response=await supabase.from("articles").select("title,slug,excerpt,location,cover_url,is_advertorial,published_at,profiles!articles_author_id_fkey(full_name),categories(name)",{count:"exact"}).eq("status","published").or(`title.ilike.%${term.replaceAll(",","")}%,excerpt.ilike.%${term.replaceAll(",","")}%`).order("published_at",{ascending:false}).range(from,from+11);if(response.error)throw new Error("Pencarian belum dapat dimuat.");count=response.count??0;results=(response.data??[]).filter(a=>a.slug).map(a=>({slug:a.slug!,title:a.title,excerpt:a.excerpt??"",category:(a.categories as unknown as {name:string}|null)?.name??"Berita",location:a.location??"Kalimantan Timur",author:(a.profiles as unknown as {full_name:string}|null)?.full_name??"Redaksi",publishedAt:a.published_at?new Intl.DateTimeFormat("id-ID",{dateStyle:"long"}).format(new Date(a.published_at)):"",image:a.cover_url??"/window.svg",advertorial:a.is_advertorial}));}
  const totalPages=Math.max(1,Math.ceil(count/12));
  const pageHref=(target:number)=>`/cari?q=${encodeURIComponent(term)}&page=${target}`;
  return <><SiteHeader/><main className="shell bbc-search-page">
    <h1 className="visually-hidden">Pencarian berita</h1>

    <form className="bbc-search-bar" action="/cari" role="search">
      <label className="visually-hidden" htmlFor="bbc-search-q">Cari berita</label>
      <input id="bbc-search-q" name="q" defaultValue={term} placeholder="Cari berita, topik..." autoFocus autoComplete="off"/>
      {term&&<Link className="bbc-search-clear" href="/cari" aria-label="Hapus pencarian"><X size={30} strokeWidth={1.8}/></Link>}
      <button className="bbc-search-submit" type="submit" aria-label="Cari"><Search size={26} strokeWidth={2.2}/></button>
    </form>

    {term&&<p className="bbc-search-count">{count} hasil untuk <strong>“{term}”</strong></p>}

    {results.length>0&&<div className="bbc-results">
      {results.map(story=><article className="bbc-result" key={story.slug}>
        <Link className="bbc-result-media" href={`/artikel/${story.slug}`} aria-label={story.title} tabIndex={-1}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.image} alt=""/>
        </Link>
        <div className="bbc-result-text">
          {story.advertorial&&<span className="advertorial-label">Kerja Sama/Advertorial</span>}
          <span className="bbc-result-kicker">{story.category}</span>
          <h2><Link href={`/artikel/${story.slug}`}>{story.title}</Link></h2>
          {story.excerpt&&<p>{story.excerpt}</p>}
          {story.publishedAt&&<time className="bbc-result-meta">{story.publishedAt}</time>}
        </div>
      </article>)}
    </div>}

    {term&&!results.length&&<div className="empty-state"><h2>Berita tidak ditemukan</h2><p>Coba kata kunci yang lebih singkat.</p></div>}
    {!term&&<p className="bbc-search-hint">Ketik kata kunci di atas untuk mencari berita dan topik dari Kaltim Insider.</p>}

    {count>0&&<nav className="bbc-pagination" aria-label="Halaman pencarian">
      {page>1&&<Link className="bbc-page-arrow" href={pageHref(page-1)} aria-label="Halaman sebelumnya"><ChevronLeft size={18} strokeWidth={2.2}/></Link>}
      {pageWindow(totalPages,page).map((item,index)=>item==="…"
        ?<span className="bbc-page bbc-page-dots" key={`dots-${index}`} aria-hidden="true">…</span>
        :<Link key={item} className={`bbc-page${item===page?" active":""}`} href={pageHref(item)} aria-current={item===page?"page":undefined}>{item}</Link>)}
      {page<totalPages&&<Link className="bbc-page-arrow" href={pageHref(page+1)} aria-label="Halaman berikutnya"><ChevronRight size={18} strokeWidth={2.2}/></Link>}
    </nav>}
  </main><SiteFooter/></>;
}
