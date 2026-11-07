import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contributorParams, contributorArticleSearch } from "./contributor.ts";

test("article search treats wildcards as title text and validates sorting", () => {
  assert.deepEqual(contributorArticleSearch({ q: "  50%_\\  ", order: "oldest" }), { query: "50%_\\", pattern: "%50\\%\\_\\\\%", oldest: true });
  assert.equal(contributorArticleSearch({ q: ["one", "two"], order: "invalid" }).oldest, false);
  assert.equal(contributorArticleSearch({ q: ["one"] }).query, "");
  assert.equal(contributorArticleSearch({ q: "a".repeat(101) }).query.length, 100);
});

test("Tailwind loader leaves dashboard CSS Modules to Next.js", () => {
  const config = readFileSync("next.config.ts", "utf8");
  assert.match(config, /"globals\.css":/);
  assert.doesNotMatch(config, /"\*\.css":/);
});

test("dashboard validates query parameters and preserves old pagination links", () => {
  assert.deepEqual(contributorParams({}), { tab: "notifikasi", page: 1, status: undefined });
  assert.deepEqual(contributorParams({ page: "2", status: "revision" }), { tab: "artikel", page: 2, status: "revision" });
  for (const page of ["-1", "1.5", "Infinity", "1000001", "invalid"]) {
    assert.equal(contributorParams({ tab: "artikel", page }).page, 1);
  }
  assert.deepEqual(contributorParams({ tab: "__proto__", status: "unknown", page: ["2", "3"] }), { tab: "artikel", page: 1, status: undefined });
  assert.equal(contributorParams({ tab: "panduan", page: "2" }).tab, "panduan");
});
