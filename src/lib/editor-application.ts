const levels = ["madya", "utama"] as const;
const types = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

export function editorApplicantEligible(createdAt: string, published: number, now = Date.now()) {
  return published >= 5 && now - Date.parse(createdAt) >= 30 * 86400000;
}

export function editorApplicationInput(formData: FormData) {
  const text = (name: string, min: number, max: number) => {
    const value = String(formData.get(name) ?? "").trim();
    return value.length >= min && value.length <= max ? value : null;
  };
  const level = String(formData.get("ukw_level") ?? "");
  const year = Number(formData.get("ukw_year"));
  const currentYear = new Date().getFullYear();
  const value = {
    ukw_number: text("ukw_number", 4, 80), ukw_level: levels.find(item => item === level),
    ukw_issuer: text("ukw_issuer", 2, 120), ukw_year: year,
    media_name: text("media_name", 2, 120), experience: text("experience", 20, 2000),
    portfolio: text("portfolio", 10, 2000), motivation: text("motivation", 20, 2000),
  };
  if (Object.values(value).some(item => item === null || item === undefined) || !Number.isInteger(year) || year < 2000 || year > currentYear) return { error: "Lengkapi data pengajuan dengan benar." } as const;
  if (formData.get("ethics") !== "yes" || formData.get("truth") !== "yes") return { error: "Setujui kode etik dan pernyataan kebenaran data." } as const;
  return { value } as const;
}

export async function editorDocument(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || !file.size || file.size > 2.5 * 1024 * 1024 || !(file.type in types)) return null;
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const pdf = file.type === "application/pdf" && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  const jpeg = file.type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = file.type === "image/png" && bytes.slice(0, 8).every((value, index) => value === [137,80,78,71,13,10,26,10][index]);
  const webp = file.type === "image/webp" && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return pdf || jpeg || png || webp ? { file, extension: types[file.type as keyof typeof types] } : null;
}
