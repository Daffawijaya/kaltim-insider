import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { accountDetails, otpRequest } from "./auth.ts";
import { usernameBase, usernameCandidate, sanitizeUsername } from "./username.ts";
import { ARTICLE_IMAGE_HEIGHT, ARTICLE_IMAGE_WIDTH, PROFILE_IMAGE_SIZE, articleImageCrop, articleImagePath, staleArticleImage, validProfileWebP, validWebP, webPDimensions } from "./images.ts";
import { getSiteUrl } from "./site-url.ts";
import { articleStatuses } from "./editorial.ts";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";

test("OTP signup may create a user; login cannot create an unknown email", async () => {
  const users = new Set<string>();
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  const client = createClient("https://auth.example.test", "test-public-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const path = new URL(String(input)).pathname;
      const body = JSON.parse(String(init?.body));
      requests.push({ path, body });
      if (path.endsWith("/otp")) {
        if (!users.has(body.email) && !body.create_user) return new Response(JSON.stringify({ msg: "not registered" }), { status: 400 });
        users.add(body.email);
        return new Response("{}");
      }
      return new Response(JSON.stringify({ access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer", user: { id: "user-1", email: body.email } }));
    } },
  });
  const request = async (email: string, mode: "signin" | "signup") => {
    return client.auth.signInWithOtp(otpRequest(email, mode));
  };
  assert.ok((await request("new@example.com", "signin")).error);
  assert.equal(users.size, 0);
  assert.equal((await request("new@example.com", "signup")).error, null);
  assert.equal((await request("new@example.com", "signin")).error, null);
  assert.equal(requests[0].body.create_user, false);
  assert.equal(requests[1].body.create_user, true);
  assert.equal(requests[2].body.create_user, false);
  const verified = await client.auth.verifyOtp({ email: "new@example.com", token: "123456", type: "email" });
  assert.equal(verified.error, null);
  assert.equal(requests[3].path, "/auth/v1/verify");
  assert.equal(requests[3].body.token, "123456");
  const form = readFileSync("src/components/auth-form.tsx", "utf8");
  assert.match(form, /signInWithOtp\(otpRequest\(nextEmail, mode\)\)/);
  assert.match(form, /verifyOtp\(\{ email, token, type: "email" \}\)/);
  assert.match(form, /pattern="\[0-9\]\{6\}"/);
  assert.match(form, /signIn\(form\)/);
  assert.match(form, /Email atau username/);
  assert.match(readFileSync("src/app/actions/auth.ts", "utf8"), /signInWithPassword/);
  assert.match(form, /completeSignup\(form\)/);
  assert.match(form, /autoComplete="given-name"/);
  assert.match(form, /autoComplete="family-name"/);
});

test("username candidates are a slug of the name plus four trailing digits", () => {
  const seen = new Set<string>();
  for (let index = 0; index < 50; index += 1) seen.add(usernameCandidate("  Daffa   Wijaya "));
  for (const candidate of seen) assert.match(candidate, /^daffa-wijaya\d{4}$/);
  assert.equal(usernameBase("!!!"), "user");
  assert.equal(usernameCandidate("!!!", () => 0), "user1000");
  assert.equal(usernameCandidate("José Álvarez", () => 0), "jose-alvarez1000");
  assert.equal(sanitizeUsername("Budi-Santoso4821".toLowerCase()), "budi-santoso4821");
  for (const bad of ["ab", "-budi", "budi-", "budi--santoso", "budi santoso", "budi_santoso", ""]) assert.equal(sanitizeUsername(bad), null);
});

test("signup requires a first name and a strong-enough password", () => {
  assert.deepEqual(accountDetails("  Daffa   Wijaya  ", "", "rahasia8"), { name: "Daffa Wijaya", first: "Daffa Wijaya", last: "", password: "rahasia8" });
  assert.deepEqual(accountDetails("Daffa", "Wijaya", "rahasia8"), { name: "Daffa Wijaya", first: "Daffa", last: "Wijaya", password: "rahasia8" });
  assert.deepEqual(accountDetails("Daffa", "", "rahasia8"), { name: "Daffa", first: "Daffa", last: "", password: "rahasia8" });
  for (const [first, last, password] of [["D", "", "rahasia8"], ["Daffa", "", "pendek1"], ["Daffa", "", "tanpaangka"], ["Daffa", "", "12345678"], ["Daffa", "", "hurufaja "]]) {
    assert.ok(accountDetails(first, last, password).error);
  }
});

test("cover URLs must use this project's bucket and the author's folder", () => {
  const base = "https://project.supabase.co";
  const path = "/storage/v1/object/public/article-images/user-1/photo-1.webp";
  assert.equal(articleImagePath(base + path, base, "user-1"), "user-1/photo-1.webp");
  for (const url of ["https://evil.example" + path, base + path + "?x=1", base + path.replace("user-1", "user-2"), base + path.replace("article-images", "other"), base + path.replace("photo-1.webp", "%2e%2e/file.webp")]) {
    assert.equal(articleImagePath(url, base, "user-1"), null);
  }
});

function extendedWebP(width: number, height: number) {
  const bytes = new Uint8Array(30);
  bytes.set([82,73,70,70,22,0,0,0,87,69,66,80,86,80,56,88,10,0,0,0], 0);
  const set24 = (offset: number, value: number) => { bytes[offset] = value & 255; bytes[offset + 1] = value >> 8 & 255; bytes[offset + 2] = value >> 16 & 255; };
  set24(24, width - 1); set24(27, height - 1);
  return bytes;
}

test("article images use a centered 16:9 crop", () => {
  assert.deepEqual(articleImageCrop(1024, 576), { x: 0, y: 0, width: 1024, height: 576 });
  assert.deepEqual(articleImageCrop(1024, 1000), { x: 0, y: 212, width: 1024, height: 576 });
  const wide = articleImageCrop(2000, 1000);
  assert.equal(wide.y, 0);
  assert.ok(Math.abs(wide.x - 111.111) < 0.001);
  assert.ok(Math.abs(wide.width - 1777.778) < 0.001);
});

test("upload boundary requires a valid 1024 × 576 WebP", async () => {
  const image = extendedWebP(ARTICLE_IMAGE_WIDTH, ARTICLE_IMAGE_HEIGHT);
  assert.deepEqual(webPDimensions(image), { width: 1024, height: 576 });
  assert.equal(await validWebP(new File([image], "photo.webp", { type: "image/webp" })), true);
  assert.equal(await validWebP(new File([extendedWebP(2048, 1152)], "photo.webp", { type: "image/webp" })), false);
  assert.equal(await validWebP(new File([image], "photo.png", { type: "image/png" })), false);
  assert.equal(await validWebP(new File(["not an image"], "photo.webp", { type: "image/webp" })), false);
  assert.equal(await validWebP(new File([], "photo.webp", { type: "image/webp" })), false);
  assert.equal(await validWebP(new File([new Uint8Array(5242881)], "photo.webp", { type: "image/webp" })), false);
});

test("profile photos require a valid square WebP", async () => {
  assert.equal(await validProfileWebP(new File([extendedWebP(PROFILE_IMAGE_SIZE, PROFILE_IMAGE_SIZE)], "avatar.webp", { type: "image/webp" })), true);
  assert.equal(await validProfileWebP(new File([extendedWebP(1024, 576)], "avatar.webp", { type: "image/webp" })), false);
});

test("orphan cleanup only considers old safe image objects", () => {
  const now = Date.now();
  const old = new Date(now - 48 * 60 * 60 * 1000).toISOString();
  assert.equal(staleArticleImage({ id: "object", name: "cover.webp", created_at: old }, now), true);
  assert.equal(staleArticleImage({ id: "object", name: "legacy.png", created_at: old }, now), true);
  assert.equal(staleArticleImage({ id: "object", name: "cover.webp", created_at: new Date(now).toISOString() }, now), false);
  assert.equal(staleArticleImage({ id: "object", name: "../cover.webp", created_at: old }, now), false);
});

test("production requires a public HTTPS site URL", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const previousVercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const previousVercelUrl = process.env.VERCEL_URL;
  const previousMode = process.env.NODE_ENV;
  try {
    Object.assign(process.env, { NODE_ENV: "production" });
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
    assert.throws(getSiteUrl, /NEXT_PUBLIC_SITE_URL|Vercel/);
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "kaltim-insider.vercel.app";
    assert.equal(getSiteUrl(), "https://kaltim-insider.vercel.app");
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    for (const value of ["http://localhost:3000", "https://localhost", "https://user:pass@example.com", "https://example.com/path"]) {
      process.env.NEXT_PUBLIC_SITE_URL = value;
      assert.throws(getSiteUrl);
    }
    process.env.NEXT_PUBLIC_SITE_URL = "https://news.example.com/";
    assert.equal(getSiteUrl(), "https://news.example.com");
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = previousUrl;
    if (previousVercelProductionUrl === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL; else process.env.VERCEL_PROJECT_PRODUCTION_URL = previousVercelProductionUrl;
    if (previousVercelUrl === undefined) delete process.env.VERCEL_URL; else process.env.VERCEL_URL = previousVercelUrl;
    if (previousMode === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Object.assign(process.env, { NODE_ENV: previousMode });
  }
});

test("production public pages have no demo articles, fallback body, page-view writes or fake video", () => {
  const data = readFileSync("src/lib/data.ts", "utf8");
  assert.doesNotMatch(data, /export const stories|https?:\/\//);
  for (const file of ["src/app/page.tsx", "src/app/artikel/[slug]/page.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /fallbackBody|increment_article_view|WatchCarousel|bbc-ad-space|stories\[|\bstories\b/);
  }
  assert.match(readFileSync("src/app/page.tsx", "utf8"), /Belum ada berita/);
  assert.deepEqual([...articleStatuses], ["draft", "submitted", "revision", "approved", "published", "rejected", "archived"]);
});

test("orphan cleanup skips fresh objects, invalid paths, folders and invalid timestamps", () => {
  assert.match(execFileSync(process.execPath, ["scripts/cleanup-images.mjs", "--self-test"], { encoding: "utf8" }), /PASS/);
});
