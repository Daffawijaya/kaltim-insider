import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { profileInput } from "./profile.ts";

function form(date = "") {
  const input = new FormData();
  input.set("full_name", "Penulis Kaltim");
  input.set("city", "Samarinda");
  input.set("birth_date", date);
  return input;
}

test("profile edits accept a valid username candidate only when none is set yet", () => {
  const input = form();
  assert.equal(profileInput(input).error, undefined);
  input.set("username", "daffa-4821");
  const result = profileInput(input);
  assert.equal(result.error, undefined);
  assert.equal(result.data!.username, "daffa-4821");
  input.set("username", "Daffa 4821");
  assert.match(String(profileInput(input).error), /Username tidak valid/);
  input.set("username", "ab");
  assert.match(String(profileInput(input).error), /Username tidak valid/);
});

test("birth dates reject impossible and incomplete calendar dates", () => {
  for (const date of ["2001-02-29", "2000-02-31", "2000-04-31", "2000-13-01", "2000-02-", "-01-", "not-a-date"]) {
    assert.match(profileInput(form(date)).error!, /Tanggal lahir tidak valid/);
  }
  for (const date of ["", "2000-02-29", "2001-02-28"]) assert.equal(profileInput(form(date)).error, undefined);
});

test("profile validation rejects invalid biodata before saving", () => {
  const input = form();
  input.set("full_name", " ");
  assert.ok(profileInput(input).error);
  input.set("full_name", "Nama Penulis");
  input.set("bio", "a".repeat(301));
  assert.ok(profileInput(input).error);
});

function actionHarness(databaseError: { code: string; message: string } | null = null, uploadError = false, profile: { id: string; username: string | null; avatar_url: string | null } = { id: "owner-id", username: null, avatar_url: null }) {
  let saved: Record<string, unknown> | undefined;
  const output: { updateProfile?: (state: { error?: string }, input: FormData) => Promise<{ error?: string }> } = {};
  const redirect = new Error("redirect");
  const modules: Record<string, unknown> = {
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect() { throw redirect; } },
    "@/lib/dal": { requireUser: async () => profile },
    "@/lib/profile": { profileInput },
    "@/lib/username": { usernameCandidate: () => "generated-user1234" },
    "@/lib/images": { validProfileWebP: async () => true },
    "@/lib/supabase/server": { createClient: async () => ({
      from: () => ({ update: (payload: Record<string, unknown>) => {
        saved = payload;
        return { eq: (column: string, id: string) => {
          assert.equal(column, "id"); assert.equal(id, profile.id);
          return { select: () => ({ single: async () => ({ data: databaseError ? null : { id }, error: databaseError }) }) };
        } };
      } }),
      storage: { from: () => ({ upload: async () => ({ error: uploadError ? { message: "private storage detail" } : null }) }) },
    }) },
  };
  const source = ts.transpileModule(readFileSync("src/app/actions/profile.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function("require", "exports", source)((name: string) => {
    assert.ok(Object.hasOwn(modules, name), `Unexpected dependency ${name}`);
    return modules[name];
  }, output);
  return { action: output.updateProfile!, saved: () => saved, redirect };
}

test("saving a legacy profile without username generates one and redirects", async () => {
  const harness = actionHarness();
  await assert.rejects(harness.action({}, form()), error => error === harness.redirect);
  assert.equal(harness.saved()?.full_name, "Penulis Kaltim");
  assert.equal(harness.saved()?.username, "generated-user1234");
});

test("saving a legacy profile keeps a valid username submitted from the form", async () => {
  const harness = actionHarness();
  const input = form();
  input.set("username", "daffa-4821");
  await assert.rejects(harness.action({}, input), error => error === harness.redirect);
  assert.equal(harness.saved()?.username, "daffa-4821");
});

test("saving a profile that already has a username never overwrites it", async () => {
  const harness = actionHarness(null, false, { id: "owner-id", username: "existing-4821", avatar_url: null });
  const input = form();
  input.set("username", "renamed-0000");
  await assert.rejects(harness.action({}, input), error => error === harness.redirect);
  assert.equal(Object.hasOwn(harness.saved()!, "username"), false);
});

test("invalid dates and failed uploads return form errors instead of crashing the page", async () => {
  const harness = actionHarness(null, true);
  assert.match((await harness.action({}, form("2000-02-31"))).error!, /Tanggal lahir/);
  assert.equal(harness.saved(), undefined);
  const input = form();
  input.set("avatar", new File(["test"], "avatar.webp", { type: "image/webp" }));
  assert.match((await harness.action({}, input)).error!, /Foto profil belum dapat diunggah/);
  assert.equal(harness.saved(), undefined);
});

test("database errors return a safe message inside the form", async t => {
  t.mock.method(console, "error", () => {});
  const harness = actionHarness({ code: "42501", message: "private database detail" });
  const result = await harness.action({}, form());
  assert.equal(result.error, "Profil belum tersimpan. Coba lagi beberapa saat.");
  assert.doesNotMatch(result.error!, /private|42501/);
});
