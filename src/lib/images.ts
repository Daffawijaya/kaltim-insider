export function articleImagePath(value: string, origin: string, owner: string) {
  try {
    const url = new URL(value);
    const prefix = `/storage/v1/object/public/article-images/${owner}/`;
    if (url.origin !== new URL(origin).origin || url.search || url.hash || !url.pathname.startsWith(prefix)) return null;
    const filename = url.pathname.slice(prefix.length);
    return /^[a-zA-Z0-9-]+\.webp$/.test(filename) ? `${owner}/${filename}` : null;
  } catch { return null; }
}

export const ARTICLE_IMAGE_WIDTH = 1024;
export const ARTICLE_IMAGE_HEIGHT = 576;
export const PROFILE_IMAGE_SIZE = 512;

export function articleImageCrop(width: number, height: number) {
  const targetRatio = ARTICLE_IMAGE_WIDTH / ARTICLE_IMAGE_HEIGHT;
  if (width / height > targetRatio) {
    const cropWidth = height * targetRatio;
    return { x: (width - cropWidth) / 2, y: 0, width: cropWidth, height };
  }
  const cropHeight = width / targetRatio;
  return { x: 0, y: (height - cropHeight) / 2, width, height: cropHeight };
}

function uint24(bytes: Uint8Array, offset: number) {
  return bytes[offset] | bytes[offset + 1] << 8 | bytes[offset + 2] << 16;
}

export function webPDimensions(bytes: Uint8Array) {
  const text = (offset: number, length: number) => String.fromCharCode(...bytes.slice(offset, offset + length));
  if (bytes.length < 30 || text(0, 4) !== "RIFF" || text(8, 4) !== "WEBP") return null;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = text(offset, 4);
    const size = bytes[offset + 4] | bytes[offset + 5] << 8 | bytes[offset + 6] << 16 | bytes[offset + 7] << 24;
    const data = offset + 8;
    if (size < 0 || data + size > bytes.length) return null;
    if (type === "VP8X" && size >= 10) return { width: uint24(bytes, data + 4) + 1, height: uint24(bytes, data + 7) + 1 };
    if (type === "VP8 " && size >= 10 && bytes[data + 3] === 0x9d && bytes[data + 4] === 0x01 && bytes[data + 5] === 0x2a) {
      return { width: (bytes[data + 6] | bytes[data + 7] << 8) & 0x3fff, height: (bytes[data + 8] | bytes[data + 9] << 8) & 0x3fff };
    }
    if (type === "VP8L" && size >= 5 && bytes[data] === 0x2f) {
      return { width: 1 + ((bytes[data + 1] | bytes[data + 2] << 8) & 0x3fff), height: 1 + ((bytes[data + 2] >> 6 | bytes[data + 3] << 2 | bytes[data + 4] << 10) & 0x3fff) };
    }
    offset = data + size + (size & 1);
  }
  return null;
}

export async function validWebP(file: File) {
  if (file.type !== "image/webp" || !file.size || file.size > 5242880) return false;
  const dimensions = webPDimensions(new Uint8Array(await file.arrayBuffer()));
  return dimensions?.width === ARTICLE_IMAGE_WIDTH && dimensions.height === ARTICLE_IMAGE_HEIGHT;
}

export async function validProfileWebP(file: File) {
  if (file.type !== "image/webp" || !file.size || file.size > 2097152) return false;
  const dimensions = webPDimensions(new Uint8Array(await file.arrayBuffer()));
  return dimensions?.width === PROFILE_IMAGE_SIZE && dimensions.height === PROFILE_IMAGE_SIZE;
}

export function staleArticleImage(object: { id?: string | null; name: string; created_at?: string | null }, now = Date.now()) {
  const created = Date.parse(object.created_at ?? "");
  return Boolean(object.id && /^[a-zA-Z0-9-]+\.(?:webp|jpe?g|png)$/i.test(object.name)
    && Number.isFinite(created) && now - created > 24 * 60 * 60 * 1000);
}
