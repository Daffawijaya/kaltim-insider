"use client";

import { ChangeEvent, useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ImagePlus, Pencil, RefreshCw } from "lucide-react";
import { updateProfile, type ProfileState } from "@/app/actions/profile";
import { PROFILE_IMAGE_SIZE } from "@/lib/images";
import { usernameCandidate } from "@/lib/username";
import styles from "@/app/kontributor/profil/profile.module.css";

type Profile = {
  full_name: string;
  username: string | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
  gender: string | null;
  birth_date: string | null;
  country: string | null;
  province: string | null;
};

const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

async function squareWebP(file: File) {
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("Pilih gambar maksimal 10 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = PROFILE_IMAGE_SIZE;
    canvas.height = PROFILE_IMAGE_SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Browser tidak dapat memproses gambar.");
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, PROFILE_IMAGE_SIZE, PROFILE_IMAGE_SIZE);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", .82));
    if (!blob || blob.type !== "image/webp") throw new Error("Foto gagal diubah ke WebP. Coba gambar lain.");
    return new File([blob], "avatar.webp", { type: "image/webp" });
  } finally { bitmap.close(); }
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [avatar, setAvatar] = useState<File | null>(null);
  const nameParts = profile.full_name.trim().split(/\s+/).filter(Boolean);
  const [details, setDetails] = useState({ full_name: nameParts[0] ?? profile.full_name, last_name: nameParts.slice(1).join(" "), city: profile.city ?? "", gender: profile.gender ?? "", country: profile.country ?? "Indonesia", province: profile.province ?? "Kalimantan Timur" });
  const [preview, setPreview] = useState(profile.avatar_url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [year = "", month = "", day = ""] = (profile.birth_date ?? "").split("-");
  const [birth, setBirth] = useState({ year, month, day });
  const [username, setUsername] = useState(() => profile.username ?? usernameCandidate(profile.full_name));

  const [state, action, pending] = useActionState(async (previous: ProfileState, formData: FormData) => {
    if (avatar) formData.set("avatar", avatar);
    return updateProfile(previous, formData);
  }, {} as ProfileState);

  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  async function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError("");
    try {
      const processed = await squareWebP(file);
      setAvatar(processed);
      setPreview(old => { if (old.startsWith("blob:")) URL.revokeObjectURL(old); return URL.createObjectURL(processed); });
    } catch (cause) {
      event.target.value = "";
      setAvatar(null);
      setPreview(profile.avatar_url ?? "");
      setError(cause instanceof Error ? cause.message : "Foto gagal diproses.");
    } finally { setBusy(false); }
  }

  const birthDate = birth.year || birth.month || birth.day ? `${birth.year}-${birth.month}-${birth.day}` : "";
  return <form action={action} className={styles.form}>
    <section className={styles.photoSection}>
      <h2>Foto Profil<span>*</span></h2>
      <div className={styles.photoRow}><div className={styles.photo}>{preview ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="Pratinjau foto profil" /> : <ImagePlus />}</div><div><strong>{profile.full_name}</strong><small>Maks. 10 MB</small></div><label className={styles.change}><Pencil size={15} />{busy ? "Memproses…" : "Ganti"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} disabled={busy || pending} /></label></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>

    <section className={styles.group}><h2>Informasi Pribadi<span>*</span></h2><div className={styles.fieldStack}>
      <div className={styles.nameRow}><label><small>Nama Depan</small><input name="full_name" value={details.full_name} onChange={event => setDetails(current => ({ ...current, full_name: event.target.value }))} required maxLength={100} /></label><label><small>Nama Belakang</small><input name="last_name" value={details.last_name} onChange={event => setDetails(current => ({ ...current, last_name: event.target.value }))} maxLength={100} /></label></div>
      <div className={styles.bioField}><label><small>Deskripsi Diri</small><textarea name="bio" value={bio} onChange={event => setBio(event.target.value)} maxLength={300} /></label><small>{bio.length}/300 karakter</small></div>
      <label><small>Jenis Kelamin</small><select name="gender" value={details.gender} onChange={event => setDetails(current => ({ ...current, gender: event.target.value }))}><option value="">Pilih jenis kelamin</option><option>Laki-laki</option><option>Perempuan</option><option>Lainnya</option></select></label>
      </div>
    </section>

    <section className={styles.group}><h2>Username</h2><div className={styles.fieldStack}>
      {profile.username
        ? <label className={styles.readonly}><small>Username</small><input value={profile.username} readOnly aria-label="Username" /></label>
        : <><label className={styles.readonly}><small>Username</small><span className={styles.usernameRow}><input value={username} readOnly aria-label="Username yang akan dibuat" /><button type="button" className={styles.usernameReroll} onClick={() => setUsername(usernameCandidate([details.full_name, details.last_name].filter(Boolean).join(" ")))} aria-label="Acak username" title="Acak username"><RefreshCw size={17} aria-hidden="true" /></button></span></label><input type="hidden" name="username" value={username} /><p className={styles.usernameHint}>Username belum diatur. Dibuat otomatis dari nama + 4 angka acak dan disimpan saat profil disimpan. Ketuk tombol acak untuk pilihan lain.</p></>}
      </div>
    </section>

    <section className={styles.group}><h2>Tanggal Lahir<span>*</span></h2><input type="hidden" name="birth_date" value={birthDate} />
      <div className={styles.dateFields}><label><small>Tanggal</small><select value={birth.day} onChange={event => setBirth(current => ({ ...current, day: event.target.value }))}><option value="">Pilih tanggal</option>{Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0")).map(value => <option key={value} value={value}>{Number(value)}</option>)}</select></label>
      <label><small>Bulan</small><select value={birth.month} onChange={event => setBirth(current => ({ ...current, month: event.target.value }))}><option value="">Pilih bulan</option>{months.map((name, index) => <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>)}</select></label>
      <label><small>Tahun</small><select value={birth.year} onChange={event => setBirth(current => ({ ...current, year: event.target.value }))}><option value="">Pilih tahun</option>{Array.from({ length: 90 }, (_, index) => String(new Date().getFullYear() - 13 - index)).map(value => <option key={value}>{value}</option>)}</select></label></div>
    </section>

    <section className={styles.group}><div className={styles.groupHeading}><h2>Domisili<span>*</span></h2><p>Data ini membantu kami menghadirkan informasi yang relevan untuk wilayahmu.</p></div><div className={styles.fieldStack}>
      <label><small>Negara</small><select name="country" value={details.country} onChange={event => setDetails(current => ({ ...current, country: event.target.value }))}><option>Indonesia</option></select></label>
      <label><small>Provinsi</small><select name="province" value={details.province} onChange={event => setDetails(current => ({ ...current, province: event.target.value }))}><option>Kalimantan Timur</option></select></label>
      <label><small>Kabupaten/Kota</small><input name="city" value={details.city} onChange={event => setDetails(current => ({ ...current, city: event.target.value }))} required maxLength={100} placeholder="Contoh: Samarinda" /></label>
      </div>
    </section>

    {state.error && <p className={styles.error} role="alert">{state.error}</p>}
    <div className={styles.actions}><Link href="/kontributor">Batalkan</Link><button type="submit" disabled={busy || pending}>{pending ? "Menyimpan…" : "Simpan"}</button></div>
  </form>;
}
