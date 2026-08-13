/**
 * Client-side image pipeline: auto-resize, auto-crop (centre cover) and compress
 * before anything is uploaded, so hero banners and product photos stay light.
 */
export type ProcessOptions = {
  maxWidth?: number;
  maxHeight?: number;
  /** width/height. When set, the image is cropped to this ratio. */
  aspect?: number;
  quality?: number;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image"));
    };
    img.src = url;
  });
}

export async function processImage(file: File, opts: ProcessOptions = {}): Promise<File> {
  const { maxWidth = 1600, maxHeight = 1600, aspect, quality = 0.82 } = opts;
  if (typeof document === "undefined" || file.type === "image/gif" || file.type === "image/svg+xml") return file;

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file;
  }

  // auto crop to the target aspect ratio (centre cover)
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (aspect && sw > 0 && sh > 0) {
    const current = sw / sh;
    if (current > aspect) {
      const newW = sh * aspect;
      sx = (sw - newW) / 2;
      sw = newW;
    } else if (current < aspect) {
      const newH = sw / aspect;
      sy = (sh - newH) / 2;
      sh = newH;
    }
  }

  // auto resize within bounds
  const scale = Math.min(1, maxWidth / sw, maxHeight / sh);
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], name, { type: "image/webp" });
}
