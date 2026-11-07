export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL wajib diisi dengan URL situs produksi sebelum build/start.");
  }
  const url = new URL(configured || "http://localhost:3000");
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SITE_URL harus berupa origin HTTP(S) tanpa path atau kredensial.");
  }
  if (process.env.NODE_ENV === "production" && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error("NEXT_PUBLIC_SITE_URL produksi harus memakai HTTPS dan domain publik.");
  }
  return url.origin;
}
