"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/editorial";

export async function setUserRole(_: { error?: string; success?: string }, formData: FormData): Promise<{ error?: string; success?: string }> {
  await requireRole(["admin"]);
  const targetId = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!targetId || !["contributor", "editor", "admin"].includes(role)) return { error: "Pilih pengguna dan peran yang valid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_profile_role", { target_id: targetId, new_role: role });
  if (error) return { error: error.message === "last admin" ? "Admin terakhir tidak dapat diturunkan. Tetapkan admin lain terlebih dahulu." : "Peran belum dapat diperbarui. Muat ulang lalu coba lagi." };
  revalidatePath("/admin");
  return { success: "Peran diperbarui." };
}
