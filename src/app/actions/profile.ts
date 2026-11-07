"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { validProfileWebP } from "@/lib/images";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const full_name = [formData.get("full_name"), formData.get("last_name")].map(value => String(value ?? "").trim()).filter(Boolean).join(" ");
  const username = String(formData.get("username") ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const city = String(formData.get("city") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const birth_date = String(formData.get("birth_date") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "Indonesia").trim();
  const province = String(formData.get("province") ?? "Kalimantan Timur").trim();
  if (full_name.length < 2 || username.length < 3 || bio.length > 300 || city.length > 100 || !["", "Laki-laki", "Perempuan", "Lainnya"].includes(gender)) throw new Error("Periksa kembali data profil.");
  if (birth_date && !/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) throw new Error("Tanggal lahir tidak valid.");

  const supabase = await createClient();
  let avatar_url = user.avatar_url;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size) {
    if (!await validProfileWebP(avatar)) throw new Error("Foto profil harus berupa WebP 512 × 512 piksel, maksimal 2 MB.");
    const path = `${user.id}/avatar.webp`;
    const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(path, avatar, { contentType: "image/webp", upsert: true });
    if (uploadError) throw new Error("Foto profil belum dapat diunggah.");
    avatar_url = `${supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  }

  const { error } = await supabase.from("profiles").update({ full_name, username, city, bio, gender: gender || null, birth_date, country, province, avatar_url }).eq("id", user.id);
  if (error) throw new Error("Profil belum tersimpan. Username mungkin sudah digunakan.");
  revalidatePath("/kontributor/profil");
  revalidatePath("/kontributor");
  redirect("/kontributor/profil?saved=1");
}
