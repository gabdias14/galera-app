/** Reduz a foto antes de guardar/subir: menos quota no localStorage, upload mais rápido. */
export async function downscaleImage(
  file: File,
  maxSide = 1440,
  quality = 0.78,
): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(bitmapUrl);
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponível');
    ctx.drawImage(img, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Falha ao converter imagem'))),
        'image/jpeg',
        quality,
      );
    });
    return { blob, dataUrl };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

export function loadImage(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não consegui carregar a imagem: ${src.slice(0, 40)}`));
    img.src = src;
  });
}
