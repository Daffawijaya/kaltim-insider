import test from "node:test";
import assert from "node:assert/strict";
import { jsonLd, seoDescription, xmlEscape } from "./seo.ts";

test("JSON-LD cannot close its script element", () => {
  assert.equal(jsonLd({ title: "</script><script>alert(1)</script>" }).includes("<"), false);
});

test("SEO descriptions stay within the common snippet length", () => {
  assert.equal(seoDescription("x".repeat(200), "fallback").length, 158);
  assert.equal(seoDescription("", "Berita Kalimantan Timur"), "Berita Kalimantan Timur");
});

test("news sitemap values are XML safe", () => {
  assert.equal(xmlEscape('Kaltim & "Kukar" <baru>'), "Kaltim &amp; &quot;Kukar&quot; &lt;baru&gt;");
});
