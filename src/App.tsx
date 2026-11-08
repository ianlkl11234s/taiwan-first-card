import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import './App.css'
import { DEFAULT_STATE, FOOTER_PRESETS, SIZE_ORDER, SIZES, type CardState, type Overlay } from './core/types'
import { HEADLINE_PRESETS, inviteText, resolveHeadline } from './core/text'
import { ensureFonts, FONT_STYLE_ORDER, FONT_STYLES } from './core/fonts'
import { contrast, PALETTE_ORDER, PALETTES, resolveColors } from './core/palettes'
import { hasPhotoBg, renderCard, type RenderAssets } from './core/render'
import { overlayAt, panOffset } from './core/geometry'
import { loadStickers, STICKERS } from './core/stickers'
import { loadPhoto } from './core/photo'
import { TEMPLATE_ORDER, TEMPLATES } from './templates'
import { copyText, fileName, isInAppBrowser, renderPng, saveImage } from './core/export'

type FontStatus = 'loading' | 'ready' | 'unavailable'
type PhotoMode = 'none' | 'bg' | 'frame'

const PHOTO_MODES: { id: PhotoMode; label: string }[] = [
  { id: 'none', label: '不使用' },
  { id: 'bg', label: '滿版背景' },
  { id: 'frame', label: '照片框' },
]

type Drag =
  | { kind: 'overlay'; id: string; dx: number; dy: number }
  | { kind: 'bg'; x: number; y: number }

let overlaySeq = 0
const newOverlayId = () => `o${Date.now().toString(36)}${(overlaySeq++).toString(36)}`
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

const MAX_PREVIEW_DPR = 2
const THUMB_WIDTH = 72
const MINI_MAX_WIDTH = 112
const MINI_MAX_HEIGHT = 168

/** 小尺寸圖卡（版型縮圖、浮動預覽）：用目前的文字與配色實際畫出來 */
function CardCanvas({
  state,
  assets,
  version,
  cssWidth,
}: {
  state: CardState
  assets: RenderAssets
  version: number
  cssWidth: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_PREVIEW_DPR)
    const { width, height } = SIZES[state.size]
    const pw = Math.round(cssWidth * dpr)
    const ph = Math.round((pw * height) / width)
    if (canvas.width !== pw) canvas.width = pw
    if (canvas.height !== ph) canvas.height = ph
    renderCard(ctx, state, pw / width, assets)
  }, [state, assets, version, cssWidth])
  return <canvas ref={ref} style={{ width: cssWidth }} aria-hidden="true" />
}

export default function App() {
  const [state, setState] = useState<CardState>(DEFAULT_STATE)
  const [fontStatus, setFontStatus] = useState<FontStatus>('loading')
  const [fontVersion, setFontVersion] = useState(0)
  const [fontsEverReady, setFontsEverReady] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const [manualUrl, setManualUrl] = useState<string | null>(null)
  const [previewWidth, setPreviewWidth] = useState(0)
  const [previewVisible, setPreviewVisible] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  /** 自動複製失敗時顯示的文案，讓使用者自己長按複製 */
  const [manualCopy, setManualCopy] = useState<string | null>(null)
  /** 使用者照片（已縮小、已 decode 的 canvas），只存在記憶體 */
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [stickers, setStickers] = useState<Map<string, HTMLImageElement>>(() => new Map())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const dragRef = useRef<Drag | null>(null)

  const previewRef = useRef<HTMLCanvasElement>(null)
  const exportRef = useRef<HTMLCanvasElement | null>(null)

  const { width, height } = SIZES[state.size]
  const cardText = `${resolveHeadline(state)}${state.footer}`

  const assets = useMemo<RenderAssets>(() => ({ photo, stickers }), [photo, stickers])
  const photoBgOn = hasPhotoBg(state, assets)
  const photoMode: PhotoMode = state.photoBg ? 'bg' : state.overlays.some((o) => o.kind === 'photo') ? 'frame' : 'none'
  const selected = state.overlays.find((o) => o.id === selectedId) ?? null
  // 有可拖曳的東西時才攔截觸控，否則保留捲動頁面
  const interactive = state.overlays.length > 0 || photoBgOn

  const colors = resolveColors(state)
  // 背景照片模式文字固定白色＋深色遮罩，不適用配色對比警告
  const lowContrast = !photoBgOn && contrast(colors.bg, colors.ink) < 3

  const update = (patch: Partial<CardState>) => setState((s) => ({ ...s, ...patch }))
  const updateOverlay = (id: string, patch: Partial<Overlay>) =>
    setState((s) => ({ ...s, overlays: s.overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)) }))

  // 預先載入貼紙，載完重繪
  useEffect(() => {
    let current = true
    loadStickers().then((map) => current && setStickers(map))
    return () => {
      current = false
    }
  }, [])

  // 依實際文字載入字型切片；只採用最後一次請求的結果
  useEffect(() => {
    let current = true
    setFontStatus('loading')
    const timer = setTimeout(() => {
      ensureFonts(cardText, state.fontStyle).then((ok) => {
        if (!current) return
        setFontStatus(ok ? 'ready' : 'unavailable')
        if (ok) setFontsEverReady(true)
        setFontVersion((v) => v + 1)
      })
    }, 150)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [cardText, state.fontStyle])

  useEffect(() => {
    const canvas = previewRef.current
    if (!canvas) return
    const ro = new ResizeObserver(([entry]) => setPreviewWidth(entry.contentRect.width))
    ro.observe(canvas)
    // 主預覽大半捲出畫面時，顯示浮動小預覽
    const io = new IntersectionObserver(([entry]) => setPreviewVisible(entry.intersectionRatio > 0.35), {
      threshold: [0, 0.35, 1],
    })
    io.observe(canvas)
    return () => {
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  useEffect(() => {
    const canvas = previewRef.current
    if (!canvas || previewWidth === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_PREVIEW_DPR)
    const pw = Math.round(previewWidth * dpr)
    const ph = Math.round((pw * height) / width)
    // 只在尺寸變動時重設，避免 iOS 反覆配置 canvas 記憶體
    if (canvas.width !== pw) canvas.width = pw
    if (canvas.height !== ph) canvas.height = ph
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const layout = renderCard(ctx, state, pw / width, assets, { selectedId })
    setOverflow(layout.blocks.some((b) => b.text.overflow))
  }, [state, assets, selectedId, previewWidth, width, height, fontVersion])

  useEffect(() => {
    if (!manualUrl) return
    return () => URL.revokeObjectURL(manualUrl)
  }, [manualUrl])

  const onSave = () => {
    exportRef.current ??= document.createElement('canvas')
    // 同步產圖 + 同步呼叫 share，保住使用者手勢
    const blob = renderPng(exportRef.current, state, assets)
    saveImage(blob, fileName(state)).then((result) => {
      if (result === 'needs-manual') setManualUrl(URL.createObjectURL(blob))
    })
  }

  const toCard = (e: ReactPointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * width, ((e.clientY - r.top) / r.height) * height]
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const [x, y] = toCard(e)
    const hit = overlayAt(state.overlays, x, y, width, height)
    if (hit) {
      setSelectedId(hit.id)
      dragRef.current = { kind: 'overlay', id: hit.id, dx: x - hit.cx * width, dy: y - hit.cy * height }
    } else {
      setSelectedId(null)
      dragRef.current = photoBgOn ? { kind: 'bg', x, y } : null
    }
    if (dragRef.current) e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const [x, y] = toCard(e)
    if (drag.kind === 'overlay') {
      updateOverlay(drag.id, { cx: clamp01((x - drag.dx) / width), cy: clamp01((y - drag.dy) / height) })
    } else if (photo) {
      const dx = x - drag.x
      const dy = y - drag.y
      drag.x = x
      drag.y = y
      setState((s) =>
        s.photoBg
          ? { ...s, photoBg: { ...s.photoBg, ...panOffset(photo.width, photo.height, width, height, s.photoBg.zoom, s.photoBg, dx, dy) } }
          : s,
      )
    }
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const addOverlay = (o: Omit<Overlay, 'id' | 'cx' | 'cy' | 'rotation'>) => {
    const id = newOverlayId()
    setState((s) => ({ ...s, overlays: [...s.overlays, { id, cx: 0.5, cy: 0.5, rotation: 0, ...o }] }))
    setSelectedId(id)
    // 手機上按鈕在預覽下方，加完把預覽捲回畫面，才能直接拖曳
    if (!previewVisible) previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const removeOverlay = (id: string) => {
    setState((s) => ({ ...s, overlays: s.overlays.filter((o) => o.id !== id) }))
    setSelectedId(null)
  }

  const bringToFront = (id: string) =>
    setState((s) => {
      const o = s.overlays.find((x) => x.id === id)
      return o ? { ...s, overlays: [...s.overlays.filter((x) => x.id !== id), o] } : s
    })

  /** 照片用途切換：背景與照片框二選一 */
  const setPhotoMode = (mode: PhotoMode) => {
    const others = state.overlays.filter((o) => o.kind !== 'photo')
    if (mode === 'frame') {
      if (photoMode === 'frame') return
      update({ photoBg: null, overlays: others })
      addOverlay({ kind: 'photo', src: 'photo', size: 0.45, shape: 'circle' })
      return
    }
    update({ overlays: others, photoBg: mode === 'bg' ? (state.photoBg ?? { zoom: 1, offsetX: 0, offsetY: 0 }) : null })
    if (selected?.kind === 'photo') setSelectedId(null)
  }

  const onPhotoInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 清空才能再選同一張
    e.target.value = ''
    if (!file) return
    setPhotoError(null)
    loadPhoto(file)
      .then((canvas) => {
        setPhoto(canvas)
        // 還沒選用途時預設當滿版背景
        setState((s) =>
          s.photoBg || s.overlays.some((o) => o.kind === 'photo') ? s : { ...s, photoBg: { zoom: 1, offsetX: 0, offsetY: 0 } },
        )
      })
      .catch(() => setPhotoError('這張照片讀不出來（可能是 HEIC 等格式），請換一張 JPG 或 PNG。'))
  }

  const removePhoto = () => {
    setPhotoMode('none')
    setPhoto(null)
    setPhotoError(null)
  }

  const onReset = () => {
    setState(DEFAULT_STATE)
    setPhoto(null)
    setPhotoError(null)
    setSelectedId(null)
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(timer)
  }, [toast])

  const onCopyInvite = () => {
    const text = inviteText(state.identity, location.origin)
    copyText(text).then((ok) => {
      if (ok) {
        setManualCopy(null)
        setToast('已複製')
      } else setManualCopy(text)
    })
  }

  const copyInviteButton = (
    <button className="secondary" onClick={onCopyInvite}>
      複製邀請文案
    </button>
  )

  const canSave = fontStatus !== 'loading'

  return (
    <div className="app">
      <header className="masthead">
        <h1>我先是台灣人</h1>
        <p>輸入你的身分，做一張 11/28 投票日的社群圖卡。文字和照片只在你的手機裡處理，不會上傳。</p>
      </header>

      <section className="preview" aria-label="圖卡預覽">
        <canvas
          ref={previewRef}
          className="preview-canvas"
          role="img"
          aria-label={`${resolveHeadline(state)}／${state.footer}`}
          style={
            {
              aspectRatio: `${width} / ${height}`,
              '--ar': width / height,
              touchAction: interactive ? 'none' : undefined,
            } as CSSProperties
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
        {overflow && <p className="warn">文字太長，已縮到最小字級，請精簡一些。</p>}
        {photoBgOn && !selected && <p className="hint">在預覽上拖曳可以移動背景照片。</p>}
        {selected && (
          <div className="selection" aria-label="編輯選取的物件">
            <div className="selection-head">
              <b>{selected.kind === 'photo' ? '照片框' : (STICKERS.find((s) => s.id === selected.src)?.label ?? '貼紙')}</b>
              <button className="link" onClick={() => setSelectedId(null)}>
                完成
              </button>
            </div>
            <label className="slider">
              <span>大小</span>
              <input
                type="range"
                min={0.08}
                max={0.9}
                step={0.01}
                value={selected.size}
                onChange={(e) => updateOverlay(selected.id, { size: Number(e.target.value) })}
              />
            </label>
            <label className="slider">
              <span>旋轉</span>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={selected.rotation}
                onChange={(e) => updateOverlay(selected.id, { rotation: Number(e.target.value) })}
              />
            </label>
            {selected.kind === 'photo' && (
              <div className="segmented">
                {(['circle', 'rounded'] as const).map((shape) => (
                  <button
                    key={shape}
                    className={(selected.shape ?? 'circle') === shape ? 'active' : ''}
                    aria-pressed={(selected.shape ?? 'circle') === shape}
                    onClick={() => updateOverlay(selected.id, { shape })}
                  >
                    {shape === 'circle' ? '圓形' : '圓角方形'}
                  </button>
                ))}
              </div>
            )}
            <div className="selection-actions">
              <button className="secondary" onClick={() => bringToFront(selected.id)}>
                移到最上層
              </button>
              <button className="secondary danger" onClick={() => removeOverlay(selected.id)}>
                刪除
              </button>
            </div>
          </div>
        )}
      </section>

      {!previewVisible && !manualUrl && (
        <button
          className="mini-preview"
          aria-label="回到預覽"
          onClick={() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        >
          <CardCanvas
            state={state}
            assets={assets}
            version={fontVersion}
            cssWidth={Math.round(Math.min(MINI_MAX_WIDTH, (MINI_MAX_HEIGHT * width) / height))}
          />
        </button>
      )}

      <section className="editor">
        <div className="segmented" role="tablist" aria-label="編輯模式">
          {(['simple', 'advanced'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={state.mode === m}
              className={state.mode === m ? 'active' : ''}
              onClick={() =>
                update(m === 'advanced' && state.mode === 'simple' ? { mode: m, headline: resolveHeadline(state) } : { mode: m })
              }
            >
              {m === 'simple' ? '簡易模式' : '進階模式'}
            </button>
          ))}
        </div>

        {state.mode === 'simple' ? (
          <label className="field">
            <span>成為「＿＿」前，我先是台灣人</span>
            <input
              type="text"
              value={state.identity}
              placeholder="追星人"
              enterKeyHint="done"
              onChange={(e) => update({ identity: e.target.value })}
            />
          </label>
        ) : (
          <label className="field">
            <span>主標語（「」內的字會變成強調色）</span>
            <textarea rows={3} value={state.headline} onChange={(e) => update({ headline: e.target.value })} />
          </label>
        )}

        <div className="field">
          <span>標語範本</span>
          {HEADLINE_PRESETS.map((g) => (
            <div key={g.label} className="preset-group">
              <small>{g.label}</small>
              <div className="chips">
                {g.presets.map((p) => {
                  const active = state.mode === 'advanced' && state.headline === p
                  return (
                    <button
                      key={p}
                      className={active ? 'chip preset active' : 'chip preset'}
                      aria-pressed={active}
                      onClick={() => update({ mode: 'advanced', headline: p })}
                    >
                      {p.replace(/\n/g, '')}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="field">
          <span>底部文字</span>
          <div className="chips">
            {FOOTER_PRESETS.map((p) => (
              <button key={p} className={state.footer === p ? 'chip active' : 'chip'} onClick={() => update({ footer: p })}>
                {p}
              </button>
            ))}
          </div>
          {state.mode === 'advanced' && (
            <input type="text" value={state.footer} onChange={(e) => update({ footer: e.target.value })} />
          )}
        </div>

        <div className="field">
          <span>照片（只在本機處理，不會上傳）</span>
          {photo ? (
            <>
              <div className="segmented three" role="group" aria-label="照片用途">
                {PHOTO_MODES.map((m) => (
                  <button
                    key={m.id}
                    className={photoMode === m.id ? 'active' : ''}
                    aria-pressed={photoMode === m.id}
                    onClick={() => setPhotoMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {state.photoBg && (
                <label className="slider">
                  <span>縮放</span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={state.photoBg.zoom}
                    onChange={(e) => state.photoBg && update({ photoBg: { ...state.photoBg, zoom: Number(e.target.value) } })}
                  />
                </label>
              )}
              <div className="photo-actions">
                <label className="secondary file">
                  換一張
                  <input type="file" accept="image/*" onChange={onPhotoInput} />
                </label>
                <button className="secondary" onClick={removePhoto}>
                  移除照片
                </button>
              </div>
            </>
          ) : (
            <label className="secondary file">
              上傳照片
              <input type="file" accept="image/*" onChange={onPhotoInput} />
            </label>
          )}
          {photoError && <p className="warn">{photoError}</p>}
        </div>

        <div className="field">
          <span>貼紙（點一下加到圖卡中央，可在預覽上拖曳）</span>
          <div className="stickers">
            {STICKERS.map((s) => (
              <button
                key={s.id}
                className="sticker"
                disabled={!s.available}
                onClick={() => addOverlay({ kind: 'sticker', src: s.id, size: 0.3 })}
              >
                {s.available ? <img src={s.src} alt="" /> : <i>待授權</i>}
                <small>{s.label}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>版型</span>
          <div className="templates">
            {TEMPLATE_ORDER.map((id) => (
              <button
                key={id}
                className={state.template === id ? 'template active' : 'template'}
                aria-pressed={state.template === id}
                onClick={() => update({ template: id })}
              >
                <CardCanvas state={{ ...state, template: id }} assets={assets} version={fontVersion} cssWidth={THUMB_WIDTH} />
                <b>{TEMPLATES[id].label}</b>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>配色</span>
          <div className="palettes">
            {PALETTE_ORDER.map((id) => {
              const p = PALETTES[id]
              const active = state.palette === id && !state.customBg && !state.customInk
              return (
                <button
                  key={id}
                  className={active ? 'palette active' : 'palette'}
                  aria-pressed={active}
                  aria-label={p.label}
                  title={p.label}
                  style={{ background: p.bg, color: p.ink }}
                  onClick={() => update({ palette: id, customBg: null, customInk: null })}
                >
                  <i style={{ background: p.accent }} />
                  <small>{p.label}</small>
                </button>
              )
            })}
          </div>
          <div className="custom-colors">
            <label>
              <input type="color" value={colors.bg} onChange={(e) => update({ customBg: e.target.value.toUpperCase() })} />
              背景色
            </label>
            <label>
              <input type="color" value={colors.ink} onChange={(e) => update({ customInk: e.target.value.toUpperCase() })} />
              文字色
            </label>
            {(state.customBg || state.customInk) && (
              <button className="link" onClick={() => update({ customBg: null, customInk: null })}>
                還原配色
              </button>
            )}
          </div>
          {lowContrast && <p className="warn">文字色和背景色太接近，圖卡可能看不清楚。</p>}
        </div>

        <div className="field">
          <span>字體</span>
          <div className="segmented three">
            {FONT_STYLE_ORDER.map((id) => (
              <button
                key={id}
                className={state.fontStyle === id ? 'active' : ''}
                aria-pressed={state.fontStyle === id}
                style={{ fontFamily: FONT_STYLES[id].family, fontWeight: FONT_STYLES[id].headlineWeight }}
                onClick={() => update({ fontStyle: id })}
              >
                {FONT_STYLES[id].label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>圖片尺寸</span>
          <div className="sizes">
            {SIZE_ORDER.map((id) => (
              <button
                key={id}
                className={state.size === id ? 'size active' : 'size'}
                aria-pressed={state.size === id}
                onClick={() => update({ size: id })}
              >
                <i style={{ aspectRatio: `${SIZES[id].width} / ${SIZES[id].height}` }} />
                <b>{SIZES[id].label}</b>
                <small>
                  {SIZES[id].width}×{SIZES[id].height}
                </small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="actions">
        <button className="primary" disabled={!canSave} onClick={onSave}>
          {fontStatus === 'loading' && !fontsEverReady ? '字型載入中…' : '儲存／分享圖片'}
        </button>
        <button className="secondary" onClick={onReset}>
          重設
        </button>
        <div className="invite">{copyInviteButton}</div>
        {fontStatus === 'unavailable' && <p className="warn">無法載入網頁字型，圖片會改用手機內建字體。</p>}
      </footer>

      {manualUrl && (
        <div className="manual" role="dialog" aria-modal="true" aria-label="儲存圖片">
          <img src={manualUrl} alt="產生的圖卡" />
          <p>長按圖片 →「儲存影像」或「加入照片」</p>
          {isInAppBrowser() && <p className="hint">存不了？點右上角「⋯」選「在瀏覽器中開啟」再試一次。</p>}
          <div className="manual-actions">
            <a className="secondary" href={manualUrl} download={fileName(state)}>
              下載檔案
            </a>
            {copyInviteButton}
            <button className="primary" onClick={() => setManualUrl(null)}>
              完成
            </button>
          </div>
        </div>
      )}

      {manualCopy && (
        <div className="copy-fallback" role="dialog" aria-modal="true" aria-label="複製邀請文案">
          <p>無法自動複製，請長按下方文字手動複製：</p>
          <textarea readOnly rows={4} value={manualCopy} onFocus={(e) => e.currentTarget.select()} />
          <button className="primary" onClick={() => setManualCopy(null)}>
            關閉
          </button>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
