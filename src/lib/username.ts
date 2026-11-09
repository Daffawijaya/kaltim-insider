const slugifyName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .replace(/-+$/g, "");

export function usernameBase(name: string) {
  return slugifyName(name) || "user";
}

export function usernameCandidate(name: string, random: () => number = Math.random) {
  return `${usernameBase(name)}${1000 + Math.floor(random() * 9000)}`;
}

export function sanitizeUsername(value: string) {
  const username = value.trim().toLowerCase();
  if (username.length < 3 || username.length > 29) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/.test(username)) return null;
  if (username.includes("--")) return null;
  return username;
}
