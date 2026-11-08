import { articleStatuses } from "./editorial.ts";

export const contributorTabs = {
  artikel: "Kelola Artikel",
  notifikasi: "Notifikasi",
  kegiatan: "Kegiatan",
  panduan: "Panduan & FAQ",
};

export function contributorParams(params: Record<string, string | string[] | undefined>) {
  const tab = typeof params.tab === "string" && Object.hasOwn(contributorTabs, params.tab)
    ? params.tab as keyof typeof contributorTabs : "artikel";
  const pageNumber = Number(params.page);
  const page = Number.isSafeInteger(pageNumber) && pageNumber > 0 && pageNumber <= 1_000_000 ? pageNumber : 1;
  const status = articleStatuses.find(status => status === params.status);
  const scope = params.scope === "review" ? "review" : "mine";
  return { tab, page, status, scope };
}

export function contributorArticleSearch(params: Record<string, string | string[] | undefined>) {
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  return {
    query,
    pattern: `%${query.replace(/[\\%_]/g, "\\$&")}%`,
    oldest: params.order === "oldest",
  };
}
