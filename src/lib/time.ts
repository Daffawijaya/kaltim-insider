const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

export function absoluteDate(value: string | null | undefined) {
  return value ? dateFormat.format(new Date(value)) : "Hari ini";
}

export function relative(value: string | null | undefined) {
  if (!value) return "Hari ini";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit yang lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari yang lalu`;
  return absoluteDate(value);
}
