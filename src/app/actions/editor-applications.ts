"use server";

import { revalidatePath } from "next/cache";
import { editorApplicantEligible, editorApplicationInput, editorDocument } from "@/lib/editor-application";
import { requireRole, requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export type EditorApplicationState = { error?: string; success?: string };

export async function submitEditorApplication(_: EditorApplicationState, formData: FormData): Promise<EditorApplicationState> {
  const user = await requireUser();
  if (user.role !== "contributor") return { error: "Akunmu sudah memiliki akses editorial." };
  const input = editorApplicationInput(formData);
  if ("error" in input) return input;
  const [certificate, identity] = await Promise.all([editorDocument(formData.get("certificate")), editorDocument(formData.get("identity"))]);
  if (!certificate || !identity) return { error: "Sertifikat UKW dan KTP harus PDF/JPG/PNG/WebP asli, masing-masing maksimal 2,5 MB." };
  const supabase = await createClient();
  const [{ data: profile }, { count: published }, { data: pending }] = await Promise.all([
    supabase.from("profiles").select("created_at").eq("id", user.id).single(),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("author_id", user.id).eq("status", "published"),
    supabase.from("editor_applications").select("id").eq("user_id", user.id).eq("status", "submitted").maybeSingle(),
  ]);
  if (!profile || !editorApplicantEligible(profile.created_at, published ?? 0)) return { error: "Pengajuan membutuhkan akun aktif 30 hari dan minimal 5 artikel terbit." };
  if (pending) return { error: "Pengajuanmu sedang diperiksa." };
  const folder = `${user.id}/${crypto.randomUUID()}`;
  const certificatePath = `${folder}/ukw.${certificate.extension}`;
  const identityPath = `${folder}/identity.${identity.extension}`;
  const first = await supabase.storage.from("editor-applications").upload(certificatePath, certificate.file, { contentType: certificate.file.type });
  if (first.error) return { error: "Sertifikat UKW belum dapat diunggah." };
  const second = await supabase.storage.from("editor-applications").upload(identityPath, identity.file, { contentType: identity.file.type });
  if (second.error) { await supabase.storage.from("editor-applications").remove([certificatePath]); return { error: "KTP belum dapat diunggah." }; }
  const { error } = await supabase.from("editor_applications").insert({ user_id:user.id, ...input.value, certificate_path:certificatePath, identity_path:identityPath });
  if (error) { await supabase.storage.from("editor-applications").remove([certificatePath,identityPath]); return { error: "Pengajuan belum dapat dikirim. Coba lagi." }; }
  revalidatePath("/kontributor/redaktur"); revalidatePath("/admin/redaktur");
  return { success: "Pengajuan berhasil dikirim dan menunggu pemeriksaan admin." };
}

export async function reviewEditorApplication(_: EditorApplicationState, formData: FormData): Promise<EditorApplicationState> {
  await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!/^[a-f0-9-]{36}$/i.test(id) || !["approved","rejected"].includes(decision) || (decision === "rejected" && note.length < 10)) return { error: "Keputusan tidak valid. Penolakan memerlukan alasan minimal 10 karakter." };
  const supabase = await createClient();
  const { data } = await supabase.from("editor_applications").select("identity_path").eq("id", id).eq("status", "submitted").maybeSingle();
  if (!data) return { error: "Pengajuan sudah diproses atau tidak tersedia." };
  const { error } = await supabase.rpc("review_editor_application", { application_id:id, decision, note });
  if (error) return { error: "Keputusan belum dapat disimpan. Muat ulang lalu coba lagi." };
  if (data.identity_path) await supabase.storage.from("editor-applications").remove([data.identity_path]);
  revalidatePath("/admin/redaktur"); revalidatePath("/admin"); revalidatePath("/kontributor");
  return { success: decision === "approved" ? "Pengajuan diterima dan akses redaktur aktif." : "Pengajuan ditolak." };
}
