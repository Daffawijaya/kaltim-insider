export function localDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function eventInput(formData: FormData) {
  const value = {
    title: String(formData.get("title") ?? "").trim(),
    organizer: String(formData.get("organizer") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    requirements: String(formData.get("requirements") ?? "").trim(),
    starts_on: String(formData.get("starts_on") ?? ""),
    ends_on: String(formData.get("ends_on") ?? ""),
  };
  if (value.title.length < 3 || value.organizer.length < 2 || value.description.length < 10 || value.requirements.length < 10) return { error: "Lengkapi nama, penyelenggara, deskripsi, dan syarat event." } as const;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.starts_on) || !/^\d{4}-\d{2}-\d{2}$/.test(value.ends_on) || value.ends_on < value.starts_on) return { error: "Periode event tidak valid." } as const;
  return { value } as const;
}
