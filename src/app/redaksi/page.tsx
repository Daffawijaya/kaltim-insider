import Link from "next/link";
import { WorkspaceHeader } from "@/components/workspace-header";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export default async function Editorial({ searchParams }: PageProps<"/redaksi">) {
  await requireRole(["editor", "admin"]); const { status = "submitted", page: rawPage = "1" } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1); const allowed = ["submitted", "revision", "approved", "published", "rejected", "archived"]; const active = allowed.includes(String(status)) ? String(status) : "submitted";
  const supabase = await createClient(); const from = (page - 1) * 20;
  const { data, count, error } = await supabase.from("articles").select("id,title,status,location,cover_url,submitted_at,profiles!articles_author_id_fkey(full_name),categories(name)", { count: "exact" }).eq("status", active).order("submitted_at", { ascending: true }).range(from, from + 19); if(error)throw new Error("Antrean belum dapat dimuat."); const rows = data ?? [];
  return <div className="workspace"><WorkspaceHeader label="Meja Redaksi"/><main className="shell workspace-main"><div className="workspace-title"><div><h1>Antrean redaksi</h1><p>Periksa isi, beri catatan, dan putuskan kelayakan tulisan.</p></div></div>
    <div className="filter-row editorial-tabs">{allowed.map(item=><Link className={item===active?"filter active":"filter"} href={`/redaksi?status=${item}`} key={item}>{item.replace("_"," ")}</Link>)}</div>
    <section className="panel"><div className="panel-head"><h2>{active.replace("_"," ")}</h2><span>{count ?? 0} tulisan</span></div>{rows.length ? rows.map(a=><div className="submission" key={a.id}>{a.cover_url?/* eslint-disable-next-line @next/next/no-img-element */<img src={a.cover_url} alt=""/>:<div className="image-placeholder"/>}<div><h3>{a.title}</h3><p>{(a.profiles as unknown as {full_name:string}|null)?.full_name} · {(a.categories as unknown as {name:string}|null)?.name} · {a.location}</p></div><span className="status review">{a.status}</span><small>{a.submitted_at?new Intl.DateTimeFormat("id-ID",{dateStyle:"medium"}).format(new Date(a.submitted_at)):"—"}</small><Link className="button" href={`/redaksi/${a.id}`}>Buka</Link></div>):<div className="empty-state"><h3>Antrean bersih</h3><p>Tidak ada tulisan dalam status ini.</p></div>}</section>
    <nav className="pagination">{page>1&&<Link href={`/redaksi?status=${active}&page=${page-1}`}>← Sebelumnya</Link>}{(count??0)>page*20&&<Link href={`/redaksi?status=${active}&page=${page+1}`}>Berikutnya →</Link>}</nav>
  </main></div>;
}
