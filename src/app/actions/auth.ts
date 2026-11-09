"use server";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { createClient } from "@/lib/supabase/server";
import { accountDetails } from "@/lib/auth";


export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Sesi belum dapat diakhiri. Coba lagi.");
  redirect("/");
}

export async function signIn(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) return { error: "Email/username atau password tidak sesuai." };

  let email = identifier;
  if (!identifier.includes("@")) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return { error: "Layanan akun sedang tidak tersedia. Coba lagi beberapa saat." };
    const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });
    try {
      const [account] = await sql<{ email: string }[]>`
        select users.email
        from public.profiles
        join auth.users as users on users.id = profiles.id
        where profiles.username = ${identifier}
        limit 1
      `;
      if (!account?.email) return { error: "Email/username atau password tidak sesuai." };
      email = account.email;
    } catch {
      return { error: "Layanan akun sedang tidak tersedia. Coba lagi beberapa saat." };
    } finally {
      await sql.end({ timeout: 1 });
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { error: "Email/username atau password tidak sesuai." } : {};
}

export async function completeSignup(formData: FormData) {
  const details = accountDetails(String(formData.get("first_name") ?? ""), String(formData.get("last_name") ?? ""), String(formData.get("password") ?? ""));
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

