export type ArticleImageMeta = {
  caption: string;
};

export const emptyArticleImageMeta: ArticleImageMeta = { caption: "" };

export type ArticleContentBlock = {
  id: string;
  subtitle: string;
  body: string;
  image_url: string | null;
  image_meta: ArticleImageMeta;
};

const marker = "\n\n[[NEO_KALTIM_BLOCKS_V1]]";

export function splitArticleContent(value = "") {
  const index = value.lastIndexOf(marker);
  if (index < 0) return { body: value, cover: { ...emptyArticleImageMeta }, blocks: [] as ArticleContentBlock[] };
  try {
    const parsed = JSON.parse(value.slice(index + marker.length));
    const blocks = Array.isArray(parsed) ? parsed : parsed.blocks;
    if (!Array.isArray(blocks)) throw new Error();
    const normalizeMeta = (meta: Partial<ArticleImageMeta> | undefined): ArticleImageMeta => ({
      caption: typeof meta?.caption === "string" ? meta.caption : "",
    });
    return {
      body: value.slice(0, index),
      cover: normalizeMeta(Array.isArray(parsed) ? undefined : parsed.cover),
      blocks: blocks.filter((block): block is Omit<ArticleContentBlock, "image_meta"> & { image_meta?: ArticleImageMeta } => Boolean(
        block && typeof block.id === "string" && typeof block.subtitle === "string"
        && typeof block.body === "string" && (typeof block.image_url === "string" || block.image_url === null),
      )).map(block => ({ ...block, image_meta: normalizeMeta(block.image_meta) })),
    };
  } catch {
    return { body: value, cover: { ...emptyArticleImageMeta }, blocks: [] as ArticleContentBlock[] };
  }
}

export function joinArticleContent(body: string, blocks: ArticleContentBlock[], cover: ArticleImageMeta = emptyArticleImageMeta) {
  const hasCoverMeta = Object.values(cover).some(Boolean);
  return blocks.length || hasCoverMeta ? `${body}${marker}${JSON.stringify({ cover, blocks })}` : body;
}

export function articleContentImages(value = "") {
  return splitArticleContent(value).blocks.map(block => block.image_url).filter((url): url is string => Boolean(url));
}
