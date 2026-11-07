import { articleStatuses } from "./editorial.ts";

export const contributorTabs = {
  notifikasi: "Notifikasi",
  artikel: "Kelola Artikel",
  kegiatan: "Kegiatan",
  panduan: "Panduan & FAQ",
};

export function contributorParams(params: Record<string, string | string[] | undefined>) {
  const tab = typeof params.tab === "string" && Object.hasOwn(contributorTabs, params.tab)
    ? params.tab as keyof typeof contributorTabs : params.page ? "artikel" : "notifikasi";
  const pageNumber = Number(params.page);
  const page = Number.isSafeInteger(pageNumber) && pageNumber > 0 && pageNumber <= 1_000_000 ? pageNumber : 1;
  const status = articleStatuses.find(status => status === params.status);
  return { tab, page, status };
}

export function contributorArticleSearch(params: Record<string, string | string[] | undefined>) {
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  return {
    query,
    pattern: `%${query.replace(/[\\%_]/g, "\\$&")}%`,
    oldest: params.order === "oldest",
  };
}
