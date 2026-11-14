import { AccountPageHeader } from "@/components/account-page-header";
import { AccountShell } from "@/components/account-shell";
import { RoleForm } from "@/components/role-form";
import { Search } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/dashboard/dashboard.module.css";
import admin from "./admin.module.css";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const profile = await requireRole(["admin"]); const { q = "", page: rawPage = "1" } = await searchParams; const page = Math.max(1, Number(rawPage) || 1); const supabase = await createClient(); const from = (page - 1) * 25;
  let query = supabase.from("profiles").select("id,full_name,username,role,city,created_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + 24);
  if (String(q).trim()) query = query.ilike("full_name", `%${String(q).trim()}%`);
  const { data, count, error } = await query;
  if(error)throw new Error("Pengguna belum dapat dimuat.");
  return <AccountShell role={profile.role} className={styles.dashboard}><div className={styles.main}>
    <AccountPageHeader title="Kelola Akun" />
    <section className={`${styles.panel} ${styles.subpagePanel} ${admin.panel}`}>
      <form className={admin.search}>
        <label><span className={admin.srOnly}>Cari nama pengguna</span><input name="q" defaultValue={String(q)} placeholder="Cari nama pengguna" /><button type="submit" aria-label="Cari pengguna"><Search aria-hidden="true" /></button></label>
      </form>
      <div className={admin.heading}><h2>Pengguna</h2><span>{count ?? 0} akun</span></div>
      <div className={admin.users}>{data?.map(user => <article className={admin.user} key={user.id}>
        <div><strong>{user.full_name}</strong><small>@{user.username || "belum-diatur"} · {user.city || "Kaltim"}</small></div>
        <RoleForm id={user.id} role={user.role} />
      </article>)}</div>
    </section>
  </div></AccountShell>;
}
