import { safeRichTextHtml } from "@/lib/rich-text.server";

export function RichTextContent({ value, className }: { value: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: safeRichTextHtml(value) }} />;
}
