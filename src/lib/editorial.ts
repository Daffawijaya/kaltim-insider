export const articleStatuses = [
  "draft",
  "submitted",
  "revision",
  "approved",
  "published",
  "rejected",
  "archived",
] as const;

export type ArticleStatus = (typeof articleStatuses)[number];
export type UserRole = "contributor" | "editor" | "admin";

export type ArticleRecord = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  body: string;
  location: string | null;
  cover_url: string | null;
  status: ArticleStatus;
  published_at: string | null;
  updated_at: string;
  author_id: string;
  category_id: number | null;
  is_featured: boolean;
  is_advertorial: boolean;
  view_count: number;
  profiles?: { full_name: string; username: string | null } | null;
  categories?: { name: string; slug: string } | null;
};

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function readingMinutes(body: string) {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/).filter(Boolean).length / 200));
}
