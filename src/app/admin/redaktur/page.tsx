import { AccountPageHeader } from "@/components/account-page-header";
import { AccountShell } from "@/components/account-shell";
import { EditorReviewForm } from "@/components/editor-review-form";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import dashboard from "@/app/kontributor/dashboard.module.css";
import styles from "@/app/kontributor/redaktur/editor-application.module.css";

export default async function EditorApplicationsAdminPage() {
  const admin = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase.from("editor_applications").select("id,user_id,ukw_number,ukw_level,ukw_issuer,ukw_year,media_name,experience,portfolio,motivation,certificate_path,identity_path,created_at,profiles!editor_applications_user_id_fkey(full_name,username,city)").eq("status","submitted").order("created_at");
  if (error) throw new Error("Pengajuan redaktur belum dapat dimuat.");
  const applications = await Promise.all((data ?? []).map(async item => {
    const [certificate,identity] = await Promise.all([
      supabase.storage.from("editor-applications").createSignedUrl(item.certificate_path,300),
      item.identity_path ? supabase.storage.from("editor-applications").createSignedUrl(item.identity_path,300) : Promise.resolve({ data:null }),
    ]);
    return { ...item, certificateUrl:certificate.data?.signedUrl, identityUrl:identity.data?.signedUrl };
  }));
  return <AccountShell role={admin.role} className={dashboard.dashboard}><div className={dashboard.main}><AccountPageHeader title="Pengajuan Redaktur" />
    {applications.length ? <div className={styles.applications}>{applications.map(item => { const profile = item.profiles as unknown as { full_name:string;username:string|null;city:string|null } | null; return <article className={styles.application} key={item.id}><div className={styles.applicationHeader}><div><h2>{profile?.full_name ?? "Penulis"}</h2><p>@{profile?.username ?? "belum-diatur"} · {profile?.city ?? "Kalimantan Timur"}</p></div><span className={styles.badge}>Menunggu</span></div><div className={styles.facts}><div><strong>UKW</strong><p>{item.ukw_level.toUpperCase()} · {item.ukw_number}</p></div><div><strong>Lembaga/Tahun</strong><p>{item.ukw_issuer} · {item.ukw_year}</p></div><div><strong>Media</strong><p>{item.media_name}</p></div></div><p><strong>Pengalaman</strong>{"\n"}{item.experience}</p><p><strong>Portofolio</strong>{"\n"}{item.portfolio}</p><p><strong>Motivasi</strong>{"\n"}{item.motivation}</p><div className={styles.documents}>{item.certificateUrl && <a href={item.certificateUrl} target="_blank" rel="noreferrer">Lihat sertifikat UKW</a>}{item.identityUrl && <a href={item.identityUrl} target="_blank" rel="noreferrer">Lihat KTP</a>}</div><EditorReviewForm id={item.id} /></article>})}</div> : <section className={styles.statusCard}><h2>Belum ada pengajuan</h2><p>Pengajuan redaktur dari penulis akan muncul di sini.</p></section>}
  </div></AccountShell>;
}
