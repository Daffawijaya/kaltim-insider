"use client";

import { useEffect, useRef } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, List, ListOrdered, Quote, Redo2, Strikethrough, Underline, Undo2 } from "lucide-react";
import { richTextHtml, serializeRichText } from "@/lib/rich-text";
import styles from "./article-editor.module.css";

const tools = [
  ["undo", "Urungkan", Undo2], ["redo", "Ulangi", Redo2], ["bold", "Tebal", Bold],
  ["underline", "Garis bawah", Underline], ["italic", "Miring", Italic], ["strikeThrough", "Coret", Strikethrough],
  ["formatBlock", "Kutipan", Quote, "blockquote"], ["insertUnorderedList", "Daftar bullet", List],
  ["insertOrderedList", "Daftar bernomor", ListOrdered], ["justifyLeft", "Rata kiri", AlignLeft],
  ["justifyCenter", "Rata tengah", AlignCenter], ["justifyRight", "Rata kanan", AlignRight],
] as const;

export function RichTextEditor({ id, name, value, onChange, placeholder }: { id: string; name?: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const editor = useRef<HTMLDivElement>(null);
  const html = richTextHtml(value);

  useEffect(() => {
    if (editor.current && editor.current.innerHTML !== html) editor.current.innerHTML = html;
  }, [html]);

  const emit = () => onChange(serializeRichText(editor.current?.innerHTML ?? ""));
  const format = (command: string, commandValue?: string) => {
    editor.current?.focus();
    // shortcut: execCommand provides native selection and undo support; replace when browsers ship a stable editing API.
    document.execCommand(command, false, commandValue);
    emit();
  };

  return <div className={styles.textEditor}>
    <div className={styles.formatBar} role="toolbar" aria-label="Format isi artikel">
      {tools.map(([command, label, Icon, commandValue]) => <button key={command} type="button" aria-label={label} title={label} onMouseDown={event => { event.preventDefault(); format(command, commandValue); }}><Icon aria-hidden="true" /></button>)}
    </div>
    <div ref={editor} id={id} className={styles.editorSurface} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-required="true" data-placeholder={placeholder} onInput={emit} onPaste={event => { event.preventDefault(); document.execCommand("insertText", false, event.clipboardData.getData("text/plain")); emit(); }} />
    {name && <input type="hidden" name={name} value={value} />}
  </div>;
}
