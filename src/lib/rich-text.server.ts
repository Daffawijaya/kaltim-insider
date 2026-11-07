import sanitizeHtml from "sanitize-html";
import { richTextHtml, serializeRichText } from "./rich-text.ts";

const options: sanitizeHtml.IOptions = {
  allowedTags: ["p", "div", "br", "strong", "b", "em", "i", "u", "s", "strike", "blockquote", "ul", "ol", "li"],
  allowedAttributes: { p: ["style"], div: ["style"] },
  allowedStyles: { "*": { "text-align": [/^(left|center|right)$/] } },
};

export function safeRichTextHtml(value = "") {
  return sanitizeHtml(richTextHtml(value), options);
}

export function sanitizeRichText(value = "") {
  return serializeRichText(safeRichTextHtml(value));
}
