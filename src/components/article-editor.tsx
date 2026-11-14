"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Info, Plus, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { saveArticle, type ArticleState } from "@/app/actions/articles";
import { ImageUploader } from "@/components/image-uploader";
import { RichTextEditor } from "@/components/rich-text-editor";
import { emptyArticleImageMeta, splitArticleContent, type ArticleContentBlock, type ArticleImageMeta } from "@/lib/article-content";
import { richTextPlainText } from "@/lib/rich-text";
import styles from "./article-editor.module.css";

type Category = { id: number; name: string; slug: string };
// Channel taxonomy: parents are "News", "Bisnis", "Gaya Hidup"; children are their sub-kanal.
// Parent rows are shown as group labels only — the composites read children names,
// so articles tagged to a parent would not appear on the kanal pages.
const KANAL_GROUPS: ReadonlyArray<{ parent: string; slugs: ReadonlyArray<string> }> = [
  { parent: "news", slugs: ["daerah", "ekonomi", "pendidikan", "kesehatan", "teknologi", "lingkungan", "wisata-budaya"] },
  { parent: "bisnis", slugs: ["umkm", "industri", "pasar", "ikn"] },
  { parent: "gaya-hidup", slugs: ["kuliner", "wisata", "fashion", "hiburan"] },
];
const KANAL_TOP_LEVEL = ["olahraga", "opini"]; // standalone kanal without sub-kanal
const KANAL_HIDDEN_PARENTS = ["news", "bisnis", "gaya-hidup"]; // used as group labels only

type KanalGroup = { label: string; children: Category[] };

function childrenOf(categories: Category[], slugs: ReadonlyArray<string>): Category[] {
  return categories.filter(category => slugs.indexOf(category.slug) !== -1);
}

function buildKanalGroups(categories: Category[]): { groups: KanalGroup[]; standalone: Category[]; rest: Category[] } {
  const groups = KANAL_GROUPS
    .map(group => ({ label: parentNameOf(categories, group.parent), children: childrenOf(categories, group.slugs) }))
    .filter(group => group.children.length > 0);
  const standalone = childrenOf(categories, KANAL_TOP_LEVEL);
  const used = KANAL_GROUPS.flatMap(group => group.slugs).concat(KANAL_TOP_LEVEL, KANAL_HIDDEN_PARENTS);
  const rest = categories.filter(category => used.indexOf(category.slug) === -1);
  return { groups, standalone, rest };
}

function parentNameOf(categories: Category[], slug: string): string {
  const parent = categories.find(category => category.slug === slug);
  return parent ? parent.name : slug;
}

function KanalSelect({ id, categories, value, onChange }: { id: string; categories: Category[]; value: number | ""; onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void }) {
  const { groups, standalone, rest } = buildKanalGroups(categories);
  return <select id={id} name="category_id" value={value} onChange={onChange} required><option value="">Pilih kanal</option>{groups.map(group => <optgroup key={group.label} label={group.label}>{group.children.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</optgroup>)}{standalone.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}{rest.length > 0 && <optgroup label="Lainnya">{rest.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</optgroup>}</select>;
}
type EventOption = { id: string; title: string };
type Draft = { id?: string; title?: string; excerpt?: string; body?: string; location?: string; category_id?: number | null; event_id?: string | null; cover_url?: string | null };
type EditorSnapshot = { fields: Draft; coverMeta: ArticleImageMeta; blocks: ArticleContentBlock[]; coverFile: File | null; blockFiles: Record<string, File | null> };

export function ArticleEditor({ categories, events, draft = {}, authorName, publishDirectly = false }: { categories: Category[]; events: EventOption[]; draft?: Draft; authorName: string; publishDirectly?: boolean }) {
  const initialContent = splitArticleContent(draft.body);
  const key = `neo-draft-${draft.id ?? "new"}`;
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [blockFiles, setBlockFiles] = useState<Record<string, File | null>>({});
  const [busyImages, setBusyImages] = useState<Set<string>>(new Set());
  const [fields, setFields] = useState<Draft>({ ...draft, body: initialContent.body });
  const [coverMeta, setCoverMeta] = useState<ArticleImageMeta>(initialContent.cover);
  const [blocks, setBlocks] = useState<ArticleContentBlock[]>(initialContent.blocks);
  const [imageKey, setImageKey] = useState(0);
  const history = useRef<EditorSnapshot[]>([]);
  const future = useRef<EditorSnapshot[]>([]);
  const lastSnapshot = useRef<EditorSnapshot | null>(null);
  const restoringHistory = useRef(false);
  const skipHistory = useRef(false);
  const [state, action, pending] = useActionState(async (previous: ArticleState, formData: FormData) => {
    if (coverFile) formData.set("cover_file", coverFile);
    formData.set("cover_meta", JSON.stringify(coverMeta));
    formData.set("content_blocks", JSON.stringify(blocks.map(({ id, subtitle, body, image_meta }) => ({ id, subtitle, body, image_meta }))));
    for (const block of blocks) {
      const file = blockFiles[block.id];
      if (file) formData.set(`block_file_${block.id}`, file);
    }
    const result = await saveArticle(previous, formData);
    if (result.success) {
      skipHistory.current = true;
      setCoverFile(null);
      setBlockFiles({});
      if (result.blockUrls) setBlocks(current => current.map(block => ({ ...block, image_url: result.blockUrls?.[block.id] ?? block.image_url })));
    }
    return result;
  }, { id: draft.id } as ArticleState);

  const recover = useCallback(() => {
    const saved = localStorage.getItem(key);
    if (!saved) return;
    try {
      const value = JSON.parse(saved);
      if (value?.fields) setFields(current => ({ ...current, ...value.fields }));
      if (value?.coverMeta) setCoverMeta(value.coverMeta);
      if (Array.isArray(value?.blocks)) setBlocks(value.blocks);
    } catch { /* Ignore invalid local drafts. */ }
  }, [key]);
  useEffect(() => {
    const timer = setTimeout(recover, 0);
    return () => clearTimeout(timer);
  }, [recover]);
  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem(key, JSON.stringify({ fields, coverMeta, blocks })), 500);
    return () => clearTimeout(timer);
  }, [fields, coverMeta, blocks, key]);
  useEffect(() => {
    const current = { fields, coverMeta, blocks, coverFile, blockFiles };
    if (restoringHistory.current || skipHistory.current) {
      restoringHistory.current = false;
      skipHistory.current = false;
    } else if (lastSnapshot.current) {
      history.current.push(lastSnapshot.current);
      if (history.current.length > 100) history.current.shift();
      future.current = [];
    }
    lastSnapshot.current = current;
  }, [fields, coverMeta, blocks, coverFile, blockFiles]);
  useEffect(() => {
    if (!state.success) return;
    const timer = setTimeout(() => setFields(current => ({ ...current, category_id: state.categoryId })), 0);
    return () => clearTimeout(timer);
  }, [state.success, state.categoryId]);

  const change = (name: string, value: string | number) => setFields(current => ({ ...current, [name]: value }));
  const changeBlock = (id: string, name: "subtitle" | "body", value: string) => setBlocks(current => current.map(block => block.id === id ? { ...block, [name]: value } : block));
  const changeBlockMeta = (id: string, name: keyof ArticleImageMeta, value: string) => setBlocks(current => current.map(block => block.id === id ? { ...block, image_meta: { ...block.image_meta, [name]: value } } : block));
  const setBusy = (id: string, busy: boolean) => setBusyImages(current => { const next = new Set(current); if (busy) next.add(id); else next.delete(id); return next; });
  const reset = () => {
    const content = splitArticleContent(draft.body);
    localStorage.removeItem(key);
    setFields({ ...draft, body: content.body });
    setCoverMeta(content.cover);
    setBlocks(content.blocks);
    setCoverFile(null);
    setBlockFiles({});
    setImageKey(value => value + 1);
  };
  const addBlock = () => setBlocks(current => [...current, { id: crypto.randomUUID(), subtitle: "", body: "", image_url: null, image_meta: { ...emptyArticleImageMeta } }]);
  const removeBlock = (id: string) => {
    setBlocks(current => current.filter(block => block.id !== id));
    setBlockFiles(current => { const next = { ...current }; delete next[id]; return next; });
  };
  const restoreSnapshot = useCallback((snapshot: EditorSnapshot) => {
    restoringHistory.current = true;
    setFields(snapshot.fields);
    setCoverMeta(snapshot.coverMeta);
    setBlocks(snapshot.blocks);
    setCoverFile(snapshot.coverFile);
    setBlockFiles(snapshot.blockFiles);
    setImageKey(value => value + 1);
  }, []);
  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (!previous || !lastSnapshot.current) return;
    future.current.push(lastSnapshot.current);
    restoreSnapshot(previous);
  }, [restoreSnapshot]);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !lastSnapshot.current) return;
    history.current.push(lastSnapshot.current);
    restoreSnapshot(next);
  }, [restoreSnapshot]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [undo, redo]);
  const plainBody = [fields.body, ...blocks.map(block => block.body)].map(value => richTextPlainText(value)).join(" ");
  const words = plainBody.trim().split(/\s+/).filter(Boolean).length;
  const characters = plainBody.length;

  return <form action={action} className={styles.layout}>
    <input type="hidden" name="id" value={state.id ?? draft.id ?? ""} />
    <section className={styles.card}>
      <div className={styles.utilityRow}>
        <div className={styles.autosave}><Info size={20} aria-hidden="true" /> Progres tersimpan otomatis di perangkat</div>
        <div className={styles.utilityActions}><button type="button" onClick={recover}>Pulihkan</button><button type="button" onClick={reset}><RotateCcw size={15} /> Reset artikel</button></div>
      </div>

      <div className={styles.fields}>
        <div className="field"><label htmlFor="publisher">Penulis<span>*</span></label><input id="publisher" value={authorName} readOnly /></div>
        <div className="field"><label htmlFor="event_id">Event yang diikuti</label><select id="event_id" name="event_id" value={fields.event_id ?? ""} onChange={event => change("event_id", event.target.value)}><option value="">Tidak terkait event</option>{events.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}</select>{!events.length && <small className={styles.hint}>Belum ada event aktif yang kamu ikuti.</small>}</div>
        <div className="field"><label htmlFor="category_id">Kanal<span>*</span></label><KanalSelect id="category_id" categories={categories} value={fields.category_id ?? ""} onChange={event => change("category_id", Number(event.target.value))} /></div>
        <div className={`field ${styles.narrowField}`}><label htmlFor="location">Lokasi<span>*</span></label><input id="location" name="location" value={fields.location ?? ""} onChange={event => change("location", event.target.value)} placeholder="Kabupaten/kota" required /></div>
        <div className="field"><label htmlFor="title">Judul artikel<span>*</span></label><input id="title" name="title" value={fields.title ?? ""} onChange={event => change("title", event.target.value)} placeholder="Masukkan judul artikel" maxLength={70} required /><small className={styles.counter}>{String(fields.title ?? "").length}/70</small></div>
        <div className="field"><label htmlFor="excerpt">Ringkasan<span>*</span></label><textarea id="excerpt" name="excerpt" value={fields.excerpt ?? ""} onChange={event => change("excerpt", event.target.value)} placeholder="Jelaskan inti kabar dalam 1–2 kalimat" required /></div>
        <div className="field"><label>Gambar utama<span>*</span></label><ImageUploader key={`${state.id ?? "new"}-${state.coverUrl ?? draft.cover_url ?? "initial"}-${imageKey}`} initialUrl={state.coverUrl ?? draft.cover_url ?? ""} initialFile={coverFile} caption={coverMeta.caption} onBusy={busy => setBusy("cover", busy)} onFile={setCoverFile} onCaptionChange={caption => setCoverMeta({ caption })} /></div>
        <div className="field"><label htmlFor="body">Isi artikel<span>*</span></label><RichTextEditor id="body" name="body" value={fields.body ?? ""} onChange={value => change("body", value)} placeholder="Mulai dengan fakta terpenting: siapa, apa, kapan, di mana, mengapa, dan bagaimana." /></div>

        {blocks.map((block, index) => <section className={styles.contentBlock} key={block.id}>
          <div className={styles.blockHeading}><h2>Bagian tambahan {index + 1}</h2><button type="button" onClick={() => removeBlock(block.id)}><Trash2 size={17} /> Hapus</button></div>
          <div className="field"><label htmlFor={`subtitle-${block.id}`}>Subjudul<span>*</span></label><input id={`subtitle-${block.id}`} value={block.subtitle} onChange={event => changeBlock(block.id, "subtitle", event.target.value)} placeholder="Masukkan subjudul" required /></div>
          <div className="field"><label>Gambar<span>*</span></label><ImageUploader key={`${block.id}-${block.image_url ?? "new"}-${imageKey}`} name={`block_url_${block.id}`} initialUrl={block.image_url ?? ""} initialFile={blockFiles[block.id]} caption={block.image_meta.caption} onBusy={busy => setBusy(block.id, busy)} onFile={file => setBlockFiles(current => ({ ...current, [block.id]: file }))} onCaptionChange={caption => changeBlockMeta(block.id, "caption", caption)} /></div>
          <div className="field"><label htmlFor={`block-body-${block.id}`}>Isi artikel<span>*</span></label><RichTextEditor id={`block-body-${block.id}`} value={block.body} onChange={value => changeBlock(block.id, "body", value)} placeholder="Tulis kelanjutan artikel pada bagian ini." /></div>
        </section>)}

        <small className={styles.counter}>Kata: {words} · Karakter: {characters}</small>
        <button className={styles.addContent} type="button" onClick={addBlock}><Plus size={22} /> Tambah Bagian</button>
        {state.error && <p className="form-message error" role="alert">{state.error}</p>}
      </div>
    </section>

    <aside className={styles.floatingActions} aria-label="Aksi tulisan">
      <button name="intent" value="draft" formNoValidate disabled={pending || busyImages.size > 0} title="Simpan draf"><Save size={21} /><span>Simpan draf</span></button>
      <button name="intent" value="submit" className={styles.submit} disabled={pending || busyImages.size > 0} title={publishDirectly ? "Terbitkan" : "Kirim ke redaksi"}><Send size={21} /><span>{publishDirectly ? "Terbitkan" : "Kirim ke redaksi"}</span></button>
    </aside>
  </form>;
}
