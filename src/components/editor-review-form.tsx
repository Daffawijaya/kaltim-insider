"use client";

import { useActionState } from "react";
import { reviewEditorApplication, type EditorApplicationState } from "@/app/actions/editor-applications";
import styles from "@/app/dashboard/redaktur/editor-application.module.css";

export function EditorReviewForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(reviewEditorApplication, {} as EditorApplicationState);
  return <form action={action} className={styles.review}><input type="hidden" name="id" value={id} /><label>Catatan admin<textarea name="note" maxLength={1000} placeholder="Wajib diisi jika pengajuan ditolak" /></label><div><button className="button" name="decision" value="rejected" disabled={pending}>Tolak</button><button className="button primary" name="decision" value="approved" disabled={pending}>Terima</button></div>{state.error && <p className={styles.error} role="alert">{state.error}</p>}{state.success && <p className={styles.success} role="status">{state.success}</p>}</form>;
}
