import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StoryCard } from "@/components/story-card";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, jsonLd, seoDescription } from "@/lib/seo";
import type { Story } from "@/lib/data";

const getAuthor = cache(async (username: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id,full_name,username,city,bio,avatar_url").eq("username", username).maybeSingle();
  if (error) throw new Error("Penulis belum dapat dimuat.");
  return data;
});

export async function generateMetadata({ params }: PageProps<"/penulis/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getAuthor(username);
  if (!profile) return {};
  const description = seoDescription(profile.bio ?? "", `Profil dan berita terbaru ${profile.full_name}, penulis Kaltim Insider dari ${profile.city || "Kalimantan Timur"}.`);
  return { title: `${profile.full_name} - Penulis Berita Kaltim`, description, alternates: { canonical: `/penulis/${username}` }, openGraph: { type: "profile", title: profile.full_name, description, url: `/penulis/${username}`, images: profile.avatar_url ? [profile.avatar_url] : [] } };
}

export default async function AuthorPage({ params }: PageProps<"/penulis/[username]">) {
  const { username } = await params;
  const profile = await getAuthor(username);
  if (!profile) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.from("articles").select("title,slug,excerpt,location,cover_url,is_advertorial,published_at,categories(name)").eq("author_id", profile.id).eq("status", "published").order("published_at", { ascending: false });
  if (error) throw new Error("Berita belum dapat dimuat.");
  const stories: Story[] = (data ?? []).filter(article => article.slug).map(article => ({ slug: article.slug!, title: article.title, excerpt: article.excerpt ?? "", category: (article.categories as unknown as { name: string } | null)?.name ?? "Berita", location: article.location ?? "Kalimantan Timur", author: profile.full_name, publishedAt: article.published_at ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(article.published_at)) : "", image: article.cover_url ?? "/window.svg", advertorial: article.is_advertorial }));
  const profileUrl = absoluteUrl(`/penulis/${username}`);
  const structuredData = { "@context": "https://schema.org", "@type": "ProfilePage", mainEntity: { "@type": "Person", name: profile.full_name, url: profileUrl, image: profile.avatar_url || undefined, description: profile.bio || undefined, homeLocation: { "@type": "Place", name: profile.city || "Kalimantan Timur" } } };
  return <><SiteHeader/><main className="shell listing-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}/><header className="author-head"><span className="avatar">{profile.full_name[0]}</span><div><span className="kicker">Penulis Berita Kaltim</span><h1>{profile.full_name}</h1><p>{profile.bio || `Kabar dari ${profile.city || "Kalimantan Timur"}`}</p></div></header><div className="latest-grid">{stories.map(story => <StoryCard story={story} key={story.slug}/>)}</div></main><SiteFooter/></>;
}
