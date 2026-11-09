"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { validProfileWebP } from "@/lib/images";
import { createClient } from "@/lib/supabase/server";
import { profileInput } from "@/lib/profile";
import { usernameCandidate } from "@/lib/username";

export type ProfileState = { error?: string };

export async function updateProfile(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const input = profileInput(formData);
  if (input.error !== undefined) return { error: input.error };

  const supabase = await createClient();
  let avatar_url = user.avatar_url;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size) {
    if (!await validProfileWebP(avatar)) return { error: "Foto profil harus berupa WebP 512 × 512 piksel, maksimal 2 MB." };
    const path = `${user.id}/avatar.webp`;
    const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(path, avatar, { contentType: "image/webp", upsert: true });
    if (uploadError) return { error: "Foto profil belum dapat diunggah. Coba lagi." };
    avatar_url = `${supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  }

  // Akun yang belum punya username: buat otomatis dari nama + angka acak, pastikan unik.
  const { username: submittedUsername, ...base } = { ...input.data, avatar_url };
  const wantsUsername = !user.username;
  let data: { id: string } | null = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = wantsUsername
      ? attempt === 0 ? submittedUsername ?? usernameCandidate(input.data.full_name) : usernameCandidate(input.data.full_name)
      : undefined;
    const finalPayload = candidate ? { ...base, username: candidate } : base;
    const result = await supabase.from("profiles").update(finalPayload).eq("id", user.id).select("id").single();
    if (!result.error && result.data) { data = result.data; break; }
    if (result.error?.code === "23505" && wantsUsername) continue; // username kembar, coba kandidat baru
    console.error("Profile update failed", { code: result.error?.code });
    return { error: "Profil belum tersimpan. Coba lagi beberapa saat." };
  }
  if (!data) return { error: "Profil belum tersimpan. Coba lagi beberapa saat." };
  revalidatePath("/kontributor/profil");
  revalidatePath("/kontributor");
  redirect("/kontributor/profil?saved=1");
}
