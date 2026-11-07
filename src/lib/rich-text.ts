const marker = "[[NEO_RICH_TEXT_V1]]";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function richTextHtml(value = "") {
  if (value.startsWith(marker)) return value.slice(marker.length);
  if (!value) return "";
  return value.split(/\n{2,}/).map(paragraph => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`).join("");
}

export function serializeRichText(html: string) {
  return html ? `${marker}${html}` : "";
}

export function richTextPlainText(value = "") {
  return richTextHtml(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/blockquote>|<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ")
    .trim();
}
