"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accountDetails } from "@/lib/auth";


export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Sesi belum dapat diakhiri. Coba lagi.");
  redirect("/");
}

export async function completeSignup(formData: FormData) {
  const details = accountDetails(String(formData.get("full_name") ?? ""), String(formData.get("password") ?? ""));
  if (details.error) return { error: details.error };
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Sesi verifikasi tidak ditemukan. Masukkan ulang kode dari email." };
  const { error: authError } = await supabase.auth.updateUser({ password: details.password, data: { full_name: details.name } });
  if (authError) return { error: "Password belum dapat disimpan. Gunakan password lain lalu coba lagi." };
  const { error: profileError } = await supabase.from("profiles").update({ full_name: details.name }).eq("id", user.id);
  if (profileError) return { error: "Nama lengkap belum dapat disimpan. Coba lagi." };
  return {};
}

