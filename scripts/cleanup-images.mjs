import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

function isCandidate(object, now) {
  return Boolean(object.id && /^[a-zA-Z0-9-]+\.(?:webp|jpe?g|png)$/i.test(object.name)
    && Number.isFinite(Date.parse(object.created_at))
    && now - Date.parse(object.created_at) > 24 * 60 * 60 * 1000);
}

if (process.argv.includes("--self-test")) {
  const now = Date.now();
  const old = { id: "id", name: "photo.webp", created_at: new Date(now - 48 * 3600000).toISOString() };
  assert.equal(isCandidate(old, now), true);
  assert.equal(isCandidate({ ...old, created_at: new Date(now).toISOString() }, now), false);
  assert.equal(isCandidate({ ...old, created_at: "invalid" }, now), false);
  assert.equal(isCandidate({ ...old, name: "../other.webp" }, now), false);
  assert.equal(isCandidate({ ...old, name: "legacy.jpg" }, now), true);
  assert.equal(isCandidate({ ...old, id: null }, now), false);
  console.log("PASS cleanup candidate safety checks");
} else {
  const token = process.env.SUPABASE_USER_ACCESS_TOKEN;
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !origin || !key) throw new Error("Isi URL/key publik Supabase dan SUPABASE_USER_ACCESS_TOKEN melalui environment.");
  const client = createClient(origin, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error: authError } = await client.auth.getUser(token);
  if (authError || !user) throw new Error("Token sesi pengguna tidak valid.");
  const bucket = client.storage.from("article-images");
  const candidates = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await bucket.list(user.id, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error("Daftar Storage gagal dimuat; cleanup dihentikan.");
    candidates.push(...data.filter(object => isCandidate(object, Date.now())));
    if (data.length < 100) break;
  }
  // shortcut: a server crash can leave an upload, run this owner-scoped cleanup when needed.
  for (const object of candidates) {
    const path = `${user.id}/${object.name}`;
    const url = bucket.getPublicUrl(path).data.publicUrl;
    const { data, error } = await client.from("articles").select("id").eq("cover_url", url).limit(1);
    if (error) throw new Error("Referensi artikel gagal diperiksa; cleanup dihentikan.");
    if (data.length) continue;
    if (!process.argv.includes("--apply")) { console.log(`DRY RUN ${path}`); continue; }
    // Storage RLS checks references across all authors; never use a service-role client here.
    const removed = await bucket.remove([path]);
    if (removed.error) throw new Error("Penghapusan gagal; cleanup dihentikan.");
    console.log(`${removed.data?.length ? "REMOVED" : "SKIPPED (protected or absent)"} ${path}`);
  }
}
