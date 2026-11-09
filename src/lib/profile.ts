import { sanitizeUsername } from "./username.ts";

type ProfileInputResult =
  | { error: string; data?: undefined }
  | { error?: undefined; data: { full_name: string; city: string; bio: string; gender: string | null; birth_date: string | null; country: string; province: string; username?: string } };

export function profileInput(formData: FormData): ProfileInputResult {
  const full_name = [formData.get("full_name"), formData.get("last_name")].map(value => String(value ?? "").trim()).filter(Boolean).join(" ");
  const city = String(formData.get("city") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const birth_date = String(formData.get("birth_date") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "Indonesia").trim();
  const province = String(formData.get("province") ?? "Kalimantan Timur").trim();
  const rawUsername = String(formData.get("username") ?? "").trim();
  const username = rawUsername ? sanitizeUsername(rawUsername) : null;
  if (rawUsername && !username) return { error: "Username tidak valid. Gunakan 3–29 huruf kecil, angka, atau tanda hubung." };
  if (full_name.length < 2 || full_name.length > 201 || bio.length > 300 || city.length > 100 || country.length > 100 || province.length > 100 || !["", "Laki-laki", "Perempuan", "Lainnya"].includes(gender)) return { error: "Periksa kembali data profil." };
  if (birth_date) {
    const date = new Date(`${birth_date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth_date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== birth_date) return { error: "Tanggal lahir tidak valid. Periksa tanggal, bulan, dan tahun." };
  }
  return { data: { full_name, city, bio, gender: gender || null, birth_date, country, province, ...(username ? { username } : {}) } };
}
