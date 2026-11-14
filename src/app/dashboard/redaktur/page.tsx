import { BadgeCheck, Clock3, ShieldCheck } from "lucide-react";
import { AccountPageHeader } from "@/components/account-page-header";
import { AccountShell } from "@/components/account-shell";
import { EditorApplicationForm } from "@/components/editor-application-form";
import { requireUser } from "@/lib/dal";
import { editorApplicantEligible } from "@/lib/editor-application";
import { createClient } from "@/lib/supabase/server";
import dashboard from "../dashboard.module.css";
import styles from "./editor-application.module.css";

const labels = { submitted:"Sedang diperiksa",approved:"Diterima",rejected:"Ditolak" } as const;
type ApplicationStatus = keyof typeof labels;

export default async function EditorApplicationPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: application }, { count: published }, { data: profile }] = await Promise.all([
    supabase.from("editor_applications").select("status,admin_note,created_at,ukw_level").eq("user_id", user.id).order("created_at", { ascending:false }).limit(1).maybeSingle(),
    supabase.from("articles").select("id", { count:"exact",head:true }).eq("author_id",user.id).eq("status","published"),
    supabase.from("profiles").select("created_at").eq("id",user.id).single(),
  ]);
  const status = application?.status as ApplicationStatus | undefined;
  const eligible = !!profile && editorApplicantEligible(profile.created_at, published ?? 0);
  const oldEnough = !!profile && editorApplicantEligible(profile.created_at, 5);
  return <AccountShell role={user.role} className={dashboard.dashboard}><div className={dashboard.main}><AccountPageHeader title="Pengajuan Redaktur" />
    {user.role !== "contributor" ? <section className={styles.statusCard}><BadgeCheck aria-hidden="true" /><h2>Akses redaktur sudah aktif</h2><p>Akunmu sudah memiliki akses editorial Kaltim Insider.</p></section>
    : status === "submitted" ? <section className={styles.statusCard}><Clock3 aria-hidden="true" /><h2>{labels[status]}</h2><p>Admin sedang memeriksa sertifikat UKW, identitas, dan pengalamanmu.</p></section>
    : status === "approved" ? <section className={styles.statusCard}><BadgeCheck aria-hidden="true" /><h2>{labels[status]}</h2><p>Akses redakturmu telah disetujui.</p></section>
    : <><section className={styles.requirements}><h2>Syarat pengajuan</h2><ul><li className={oldEnough ? styles.done : ""}>Akun aktif minimal 30 hari</li><li className={(published ?? 0) >= 5 ? styles.done : ""}>Minimal 5 artikel terbit ({published ?? 0}/5)</li><li>UKW Madya atau Utama yang dapat diverifikasi</li><li>Sertifikat UKW dan KTP</li></ul>{application?.status === "rejected" && <p className={styles.rejected}><strong>Pengajuan sebelumnya ditolak.</strong> {application.admin_note}</p>}</section>{eligible ? <EditorApplicationForm /> : <section className={styles.locked}><ShieldCheck aria-hidden="true" /><h2>Belum memenuhi syarat</h2><p>Lengkapi syarat akun dan artikel terbit terlebih dahulu.</p></section>}</>}
  </div></AccountShell>;
}
