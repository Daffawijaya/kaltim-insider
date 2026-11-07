"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { articleImageCrop, ARTICLE_IMAGE_HEIGHT, ARTICLE_IMAGE_WIDTH } from "@/lib/images";
import styles from "./image-uploader.module.css";

async function toArticleWebP(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Pilih file gambar.");
  if (file.size > 30 * 1024 * 1024) throw new Error("Ukuran file maksimal 30 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width < ARTICLE_IMAGE_WIDTH || bitmap.height < ARTICLE_IMAGE_HEIGHT) {
      throw new Error(`Resolusi gambar minimal ${ARTICLE_IMAGE_WIDTH} × ${ARTICLE_IMAGE_HEIGHT} piksel.`);
    }
    const crop = articleImageCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = ARTICLE_IMAGE_WIDTH;
    canvas.height = ARTICLE_IMAGE_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Browser tidak dapat memproses gambar.");
    context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob || blob.type !== "image/webp") throw new Error("Konversi WebP gagal.");
    if (blob.size > 5 * 1024 * 1024) throw new Error("Hasil WebP maksimal 5 MB. Pilih gambar lain.");
    return new File([blob], "article-image.webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}

type Props = {
  initialUrl?: string;
  initialFile?: File | null;
  name?: string;
  caption: string;
  onBusy: (busy: boolean) => void;
  onFile: (file: File | null) => void;
  onCaptionChange: (caption: string) => void;
};

export function ImageUploader({ initialUrl = "", initialFile = null, name = "cover_url", caption, onBusy, onFile, onCaptionChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(() => initialFile ? URL.createObjectURL(initialFile) : initialUrl);
  const [open, setOpen] = useState(false);
  const [draftUrl, setDraftUrl] = useState(initialUrl);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftCaption, setDraftCaption] = useState(caption);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const discardModal = useCallback(() => {
    if (draftUrl.startsWith("blob:") && draftUrl !== url) URL.revokeObjectURL(draftUrl);
    setDraftUrl(url);
    setDraftFile(null);
    setDraftCaption(caption);
    setError("");
    setOpen(false);
  }, [caption, draftUrl, url]);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") discardModal(); };
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", close); };
  }, [discardModal, open]);
  useEffect(() => () => { if (url.startsWith("blob:")) URL.revokeObjectURL(url); }, [url]);

  function showModal() {
    setDraftUrl(url);
    setDraftFile(null);
    setDraftCaption(caption);
    setError("");
    setOpen(true);
  }

  function pickFile() {
    if (!input.current) return;
    input.current.value = "";
    input.current.click();
  }

  async function select(file?: File) {
    if (!file) return;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const processed = await toArticleWebP(file);
      if (draftUrl.startsWith("blob:") && draftUrl !== url) URL.revokeObjectURL(draftUrl);
      setDraftFile(processed);
      setDraftUrl(URL.createObjectURL(processed));
    } catch (cause) {
      if (input.current) input.current.value = "";
      setError(cause instanceof Error ? cause.message : "Unggah gambar gagal.");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  function saveModal() {
    const nextCaption = draftCaption.trim();
    if (!draftUrl) return setError("Pilih gambar terlebih dahulu.");
    if (!nextCaption) return setError("Keterangan dan sumber wajib diisi.");
    if (draftFile) {
      onFile(draftFile);
      setUrl(draftUrl);
    }
    onCaptionChange(nextCaption);
    setDraftFile(null);
    setError("");
    setOpen(false);
  }

  return <div className="upload-box">
    <input type="hidden" name={name} value={url.startsWith("blob:") ? initialUrl : url} />
    {url ? <div className={styles.preview}>
      <button type="button" className={styles.previewOpen} onClick={showModal} aria-label="Edit gambar dan keterangannya">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={url} alt={caption || "Pratinjau gambar artikel"} /></button>
      <button type="button" className={styles.replace} onClick={showModal}>Ganti Gambar</button>
    </div> : <button type="button" className="upload-trigger" onClick={showModal}><ImagePlus /><strong>Unggah gambar</strong><span>Minimal 1024 × 576 piksel · hasil WebP 16:9</span></button>}

    {open && <div className={styles.backdrop} onMouseDown={event => { if (event.target === event.currentTarget) discardModal(); }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={`${name}-dialog-title`}>
        <header><h2 id={`${name}-dialog-title`}>Unggah Gambar</h2><button type="button" onClick={discardModal} aria-label="Tutup"><X /></button></header>
        <div className={styles.modalBody}>
          <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={event => select(event.target.files?.[0])} />
          {draftUrl ? <div className={styles.modalPreview}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={draftUrl} alt="Pratinjau gambar yang akan disimpan" /><button type="button" onClick={pickFile} disabled={busy}>Ganti Gambar</button></div>
            : <button type="button" className={styles.modalUpload} onClick={pickFile} disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <ImagePlus />}<strong>{busy ? "Memproses gambar…" : "Unggah gambar"}</strong><span>Minimal 1024 × 576 piksel<br />JPG, PNG, atau WebP · maksimal 30 MB</span></button>}
          <label className={styles.caption} htmlFor={`${name}-caption`}><strong>Keterangan &amp; sumber<span>*</span></strong><textarea id={`${name}-caption`} value={draftCaption} onChange={event => setDraftCaption(event.target.value)} maxLength={500} placeholder="Contoh: Warga menghadiri Festival Mahakam. (instagram.com/akunpenyelenggara)" /><small>{draftCaption.length}/500</small></label>
          {error && <p className="form-message error" role="alert">{error}</p>}
        </div>
        <footer><button type="button" className={styles.cancel} onClick={discardModal}>Batal</button><button type="button" className={styles.save} onClick={saveModal} disabled={busy || !draftUrl || !draftCaption.trim()}>Simpan Gambar</button></footer>
      </section>
    </div>}
  </div>;
}
