import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './App.css'
import { DEFAULT_STATE, FOOTER_PRESETS, SIZE_ORDER, SIZES, type CardState } from './core/types'
import { resolveHeadline } from './core/text'
import { ensureFonts, FONT_STYLE_ORDER, FONT_STYLES } from './core/fonts'
import { contrast, PALETTE_ORDER, PALETTES, resolveColors } from './core/palettes'
import { renderCard } from './core/render'
import { TEMPLATE_ORDER, TEMPLATES } from './templates'
import { fileName, isInAppBrowser, renderPng, saveImage } from './core/export'

type FontStatus = 'loading' | 'ready' | 'unavailable'

const MAX_PREVIEW_DPR = 2
const THUMB_WIDTH = 72
const MINI_MAX_WIDTH = 112
const MINI_MAX_HEIGHT = 168

/** 小尺寸圖卡（版型縮圖、浮動預覽）：用目前的文字與配色實際畫出來 */
function CardCanvas({ state, version, cssWidth }: { state: CardState; version: number; cssWidth: number }) {
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
    renderCard(ctx, state, pw / width)
  }, [state, version, cssWidth])
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

  const previewRef = useRef<HTMLCanvasElement>(null)
  const exportRef = useRef<HTMLCanvasElement | null>(null)

  const { width, height } = SIZES[state.size]
  const cardText = `${resolveHeadline(state)}${state.footer}`

  const colors = resolveColors(state)
  const lowContrast = contrast(colors.bg, colors.ink) < 3

  const update = (patch: Partial<CardState>) => setState((s) => ({ ...s, ...patch }))

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
    const layout = renderCard(ctx, state, pw / width)
    setOverflow(layout.blocks.some((b) => b.text.overflow))
  }, [state, previewWidth, width, height, fontVersion])

  useEffect(() => {
    if (!manualUrl) return
    return () => URL.revokeObjectURL(manualUrl)
  }, [manualUrl])

  const onSave = () => {
    exportRef.current ??= document.createElement('canvas')
    // 同步產圖 + 同步呼叫 share，保住使用者手勢
    const blob = renderPng(exportRef.current, state)
    saveImage(blob, fileName(state)).then((result) => {
      if (result === 'needs-manual') setManualUrl(URL.createObjectURL(blob))
    })
  }

  const canSave = fontStatus !== 'loading'

  return (
    <div className="app">
      <header className="masthead">
        <h1>我先是台灣人</h1>
        <p>輸入你的身分，做一張 11/28 投票日的社群圖卡。文字只在你的手機裡處理，不會上傳。</p>
      </header>

      <section className="preview" aria-label="圖卡預覽">
        <canvas
          ref={previewRef}
          className="preview-canvas"
          style={{ aspectRatio: `${width} / ${height}`, '--ar': width / height } as CSSProperties}
          role="img"
          aria-label={`${resolveHeadline(state)}／${state.footer}`}
        />
        {overflow && <p className="warn">文字太長，已縮到最小字級，請精簡一些。</p>}
      </section>

      {!previewVisible && !manualUrl && (
        <button
          className="mini-preview"
          aria-label="回到預覽"
          onClick={() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        >
          <CardCanvas
            state={state}
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
          <span>版型</span>
          <div className="templates">
            {TEMPLATE_ORDER.map((id) => (
              <button
                key={id}
                className={state.template === id ? 'template active' : 'template'}
                aria-pressed={state.template === id}
                onClick={() => update({ template: id })}
              >
                <CardCanvas state={{ ...state, template: id }} version={fontVersion} cssWidth={THUMB_WIDTH} />
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
        <button className="secondary" onClick={() => setState(DEFAULT_STATE)}>
          重設
        </button>
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
            <button className="primary" onClick={() => setManualUrl(null)}>
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
