import assert from "node:assert/strict";
import test from "node:test";
import { articleContentImages, emptyArticleImageMeta, joinArticleContent, splitArticleContent } from "./article-content.ts";

test("article content blocks round-trip without changing legacy body text", () => {
  assert.deepEqual(splitArticleContent("Berita lama"), { body: "Berita lama", cover: emptyArticleImageMeta, blocks: [] });
  const imageMeta = { caption: "Warga mengikuti festival. (instagram.com/wargakaltim)" };
  const blocks = [{ id: "block-1", subtitle: "Subjudul", body: "Isi lanjutan", image_url: "https://example.com/image.webp", image_meta: imageMeta }];
  const encoded = joinArticleContent("Isi utama", blocks, imageMeta);
  assert.deepEqual(splitArticleContent(encoded), { body: "Isi utama", cover: imageMeta, blocks });
  assert.deepEqual(articleContentImages(encoded), ["https://example.com/image.webp"]);
});
