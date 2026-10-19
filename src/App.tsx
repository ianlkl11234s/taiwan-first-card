import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './App.css'
import { DEFAULT_STATE, FOOTER_PRESETS, SIZES, type CardState } from './core/types'
import { resolveHeadline } from './core/text'
import { ensureFonts } from './core/fonts'
import { renderCard } from './core/render'
import { fileName, isInAppBrowser, renderPng, saveImage } from './core/export'

type FontStatus = 'loading' | 'ready' | 'unavailable'

const MAX_PREVIEW_DPR = 2

export default function App() {
  const [state, setState] = useState<CardState>(DEFAULT_STATE)
  const [fontStatus, setFontStatus] = useState<FontStatus>('loading')
  const [fontVersion, setFontVersion] = useState(0)
  const [fontsEverReady, setFontsEverReady] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const [manualUrl, setManualUrl] = useState<string | null>(null)
  const [previewWidth, setPreviewWidth] = useState(0)

  const previewRef = useRef<HTMLCanvasElement>(null)
  const exportRef = useRef<HTMLCanvasElement | null>(null)

  const { width, height } = SIZES[state.size]
  const cardText = `${resolveHeadline(state)}${state.footer}`

  const update = (patch: Partial<CardState>) => setState((s) => ({ ...s, ...patch }))

  // 依實際文字載入字型切片；只採用最後一次請求的結果
  useEffect(() => {
    let current = true
    setFontStatus('loading')
    const timer = setTimeout(() => {
      ensureFonts(cardText).then((ok) => {
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
  }, [cardText])

  useEffect(() => {
    const canvas = previewRef.current
    if (!canvas) return
    const ro = new ResizeObserver(([entry]) => setPreviewWidth(entry.contentRect.width))
    ro.observe(canvas)
    return () => ro.disconnect()
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
    setOverflow(layout.headline.overflow || layout.footer.overflow)
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
