import assert from "node:assert/strict";
import test from "node:test";
import { richTextHtml, richTextPlainText, serializeRichText } from "./rich-text.ts";
import { safeRichTextHtml } from "./rich-text.server.ts";

test("rich text preserves formatting while legacy text remains escaped", () => {
  const formatted = serializeRichText("<p><strong>Kabar</strong> hari ini</p>");
  assert.equal(richTextHtml(formatted), "<p><strong>Kabar</strong> hari ini</p>");
  assert.equal(richTextPlainText(formatted), "Kabar hari ini");
  assert.equal(richTextHtml("<script>alert(1)</script>"), "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
});

test("rich text sanitizer keeps article formatting and removes unsafe HTML", () => {
  const value = serializeRichText('<p style="text-align: center; color: red"><strong>Aman</strong><script>alert(1)</script><img src=x></p>');
  assert.equal(safeRichTextHtml(value), '<p style="text-align:center"><strong>Aman</strong></p>');
});
