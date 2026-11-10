import assert from "node:assert/strict";
import test from "node:test";
import { editorApplicantEligible, editorApplicationInput, editorDocument } from "./editor-application.ts";

test("editor applicant needs a 30 day account and five published articles", () => {
  const now = Date.parse("2026-11-10T00:00:00Z");
  assert.equal(editorApplicantEligible("2026-10-01T00:00:00Z", 5, now), true);
  assert.equal(editorApplicantEligible("2026-11-01T00:00:00Z", 5, now), false);
  assert.equal(editorApplicantEligible("2026-10-01T00:00:00Z", 4, now), false);
});

test("editor application requires Madya or Utama UKW and consent", () => {
  const form = new FormData();
  Object.entries({ ukw_number:"UKW-1234",ukw_level:"madya",ukw_issuer:"Dewan Pers",ukw_year:"2025",media_name:"Kaltim Insider",experience:"Pengalaman jurnalistik lebih dari dua tahun.",portfolio:"https://example.com/karya",motivation:"Saya ingin menjaga mutu berita dan mendampingi penulis.",ethics:"yes",truth:"yes" }).forEach(([key,value]) => form.set(key,value));
  assert.ok("value" in editorApplicationInput(form));
  form.set("ukw_level", "muda");
  assert.ok("error" in editorApplicationInput(form));
});

test("editor documents validate content, not only MIME", async () => {
  assert.ok(await editorDocument(new File([new TextEncoder().encode("%PDF-test")], "ukw.pdf", { type: "application/pdf" })));
  assert.equal(await editorDocument(new File(["not a pdf"], "fake.pdf", { type: "application/pdf" })), null);
});
