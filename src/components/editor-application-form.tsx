"use client";

import { useActionState } from "react";
import { submitEditorApplication, type EditorApplicationState } from "@/app/actions/editor-applications";
import styles from "@/app/dashboard/redaktur/editor-application.module.css";

const currentYear = new Date().getFullYear();

export function EditorApplicationForm() {
  const [state, action, pending] = useActionState(submitEditorApplication, {} as EditorApplicationState);
  return <form action={action} className={styles.form}>
    <section><h2>Sertifikasi UKW</h2><div className={styles.grid}>
      <label>Nomor sertifikat<input name="ukw_number" required maxLength={80} /></label>
      <label>Jenjang<select name="ukw_level" required defaultValue=""><option value="" disabled>Pilih jenjang</option><option value="madya">Madya</option><option value="utama">Utama</option></select></label>
      <label>Lembaga penguji<input name="ukw_issuer" required maxLength={120} /></label>
      <label>Tahun sertifikat<input name="ukw_year" type="number" min="2000" max={currentYear} required /></label>
      <label className={styles.full}>Media tempat bertugas<input name="media_name" required maxLength={120} /></label>
      <label className={styles.full}>Sertifikat UKW<small>PDF, JPG, PNG, atau WebP — maksimal 2,5 MB</small><input name="certificate" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required /></label>
    </div></section>
    <section><h2>Pengalaman</h2><div className={styles.stack}>
      <label>Pengalaman jurnalistik<textarea name="experience" required minLength={20} maxLength={2000} /></label>
      <label>Portofolio karya<small>Satu tautan per baris</small><textarea name="portfolio" required minLength={10} maxLength={2000} /></label>
      <label>Alasan ingin menjadi redaktur<textarea name="motivation" required minLength={20} maxLength={2000} /></label>
    </div></section>
    <section><h2>Verifikasi identitas</h2><div className={styles.stack}>
      <label>Foto atau salinan KTP<small>Disimpan privat dan dihapus setelah keputusan admin.</small><input name="identity" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required /></label>
      <label className={styles.check}><input type="checkbox" name="ethics" value="yes" required />Saya bersedia mematuhi Kode Etik Jurnalistik.</label>
      <label className={styles.check}><input type="checkbox" name="truth" value="yes" required />Saya menyatakan seluruh data dan dokumen yang dikirim benar.</label>
    </div></section>
    {state.error && <p className={styles.error} role="alert">{state.error}</p>}{state.success && <p className={styles.success} role="status">{state.success}</p>}
    <button className="button primary" disabled={pending}>{pending ? "Mengirim…" : "Kirim pengajuan"}</button>
  </form>;
}
