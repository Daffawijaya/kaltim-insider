import { getSiteUrl } from "./site-url.ts";

export function absoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function xmlEscape(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}

export function seoDescription(value: string, fallback: string) {
  const text = value.replace(/\s+/g, " ").trim() || fallback;
  return text.length <= 160 ? text : `${text.slice(0, 157).trimEnd()}…`;
}
