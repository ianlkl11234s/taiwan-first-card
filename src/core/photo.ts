/**
 * 使用者照片只在本機處理：object URL → <img>（iOS 會依 EXIF 轉正）→ 縮到長邊 ≤ MAX_PHOTO_EDGE
 * 的 canvas。之後 render 直接畫這張 canvas，維持同步繪製。
 */
export const MAX_PHOTO_EDGE = 2160

/**
 * 載入並 decode 圖片。Safari 的 decode() 對大照片或 SVG 偶爾會 reject 但圖其實能畫，
 * 所以以 load 事件 + naturalWidth 判斷成功與否，decode 只當作提早解碼的提示。
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      img
        .decode()
        .catch(() => {})
        .then(() => (img.naturalWidth > 0 ? resolve(img) : reject(new Error('empty image'))))
    }
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

export async function loadPhoto(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const w0 = img.naturalWidth
    const h0 = img.naturalHeight
    const s = Math.min(1, MAX_PHOTO_EDGE / Math.max(w0, h0))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(w0 * s))
    canvas.height = Math.max(1, Math.round(h0 * s))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d context unavailable')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}
