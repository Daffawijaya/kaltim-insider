"use client";

import { useActionState } from "react";
import { createEvent, type EventState } from "@/app/actions/events";
import styles from "@/app/kontributor/kegiatan/events.module.css";

export function EventForm() {
  const [state, action, pending] = useActionState(createEvent, {} as EventState);
  return <form action={action} className={styles.form}>
    <h2>Buat event</h2>
    <div className={styles.twoColumns}><label>Nama event<input name="title" required minLength={3} maxLength={120} placeholder="Lomba Artikel Diskominfo Kukar" /></label><label>Penyelenggara<input name="organizer" required minLength={2} maxLength={120} placeholder="Diskominfo Kutai Kartanegara" /></label></div>
    <label>Deskripsi<textarea name="description" required minLength={10} maxLength={2000} placeholder="Jelaskan tema dan tujuan event." /></label>
    <label>Syarat dan ketentuan<textarea name="requirements" required minLength={10} maxLength={4000} placeholder="Tuliskan topik, ketentuan tulisan, dan syarat peserta." /></label>
    <div className={styles.twoColumns}><label>Mulai<input type="date" name="starts_on" required /></label><label>Berakhir<input type="date" name="ends_on" required /></label></div>
    {state.error && <p className="form-message error" role="alert">{state.error}</p>}{state.success && <p className="form-message success" role="status">{state.success}</p>}
    <button className="button primary" disabled={pending}>{pending ? "Menyimpan…" : "Buat event"}</button>
  </form>;
}
