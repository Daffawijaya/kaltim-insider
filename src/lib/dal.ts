import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ArticleRecord, UserRole } from "@/lib/editorial";

export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError" && authError.status !== 401 && authError.status !== 403) throw new Error("Sesi belum dapat diperiksa.");
  if (!user) return null;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,full_name,username,role,city,avatar_url,bio,gender,birth_date,country,province")
    .eq("id", user.id)
    .single();
  if (error) throw new Error("Profil belum dapat dimuat.");
  return profile ? { ...profile, email: user.email ?? "" } : null;
});

export async function requireUser() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/masuk");
  return profile;
}

export async function requireRole(roles: UserRole[]) {
  const profile = await requireUser();
  if (!roles.includes(profile.role as UserRole)) redirect("/dashboard");
  return profile;
}

const articleSelect = "id,title,slug,excerpt,body,location,cover_url,status,published_at,updated_at,author_id,category_id,is_featured,is_advertorial,view_count,profiles!articles_author_id_fkey(full_name,username),categories(name,slug)";
type PublishedArticle = Omit<ArticleRecord, "slug" | "excerpt" | "location"> & { slug: string; excerpt: string; location: string };

export async function getPublishedArticles(limit = 30) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("articles").select(articleSelect).eq("status", "published").order("published_at", { ascending: false }).limit(limit);
  if (error) throw new Error("Berita belum dapat dimuat.");
  return (data ?? []) as unknown as PublishedArticle[];
}

export const getArticleBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("articles").select(articleSelect).eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw new Error("Berita belum dapat dimuat.");
  return data as unknown as PublishedArticle | null;
});
