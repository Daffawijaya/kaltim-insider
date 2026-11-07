import { WorkspaceHeader } from "@/components/workspace-header";
import { RoleForm } from "@/components/role-form";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  await requireRole(["admin"]); const { q = "", page: rawPage = "1" } = await searchParams; const page = Math.max(1, Number(rawPage) || 1); const supabase = await createClient(); const from = (page - 1) * 25;
  let query = supabase.from("profiles").select("id,full_name,username,role,city,created_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + 24);
  if (String(q).trim()) query = query.ilike("full_name", `%${String(q).trim()}%`);
  const { data, count, error } = await query;
  if(error)throw new Error("Pengguna belum dapat dimuat.");
  if(error)throw new Error("Notifikasi belum dapat dimuat.");return <div className="workspace"><WorkspaceHeader label="Administrasi"/><main className="shell workspace-main"><div className="workspace-title"><div><h1>Pengguna dan peran</h1><p>Kelola akses penulis, editor, dan administrator.</p></div></div><form className="admin-search"><input name="q" defaultValue={String(q)} placeholder="Cari nama pengguna"/><button className="button">Cari</button></form><section className="panel"><div className="panel-head"><h2>Pengguna</h2><span>{count ?? 0} akun</span></div>{data?.map(user=><div className="user-row" key={user.id}><div><strong>{user.full_name}</strong><small>@{user.username || "belum-diatur"} · {user.city || "Kaltim"}</small></div><RoleForm id={user.id} role={user.role}/></div>)}</section></main></div>;
}
