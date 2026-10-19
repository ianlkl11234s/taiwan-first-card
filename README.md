# 我先是台灣人｜社群圖卡產生器

免登入、不上傳、手機優先的社群圖卡產生器。純前端（Vite + React + TypeScript + Canvas 2D），部署在 Cloudflare Pages。

## 開發

```bash
npm ci               # 之後新增套件若遇 npm 11 peer 解析錯誤，加 --legacy-peer-deps
npm run dev          # 開發伺服器（不套 CSP）
npm test             # 排版／文字單元測試（vitest）
npm run e2e          # 真實瀏覽器（Chromium＋WebKit）× 4 版型 × 4 尺寸 × 8 種文字＋字體組合：不超出安全區、PNG 尺寸正確
                     # 首次需 npx playwright install chromium webkit
npm run typecheck
npm run build        # 型別檢查 + 產出 dist/
npm run preview      # 以 public/_headers 的 CSP 跑正式版，部署前用來抓 CSP 違規
```

## 架構

| 檔案 | 職責 |
|---|---|
| `src/core/layout.ts` | 純函式排版：grapheme 切字、中文分詞、避頭尾、英文不拆字、孤字處理、二分搜尋字級、行長平衡 |
| `src/core/render.ts` | `renderCard(ctx, state, scale)`：預覽與匯出共用的唯一繪製路徑，以輸出像素為座標 |
| `src/core/fonts.ts` | 依實際文字載入 Google Fonts 切片，確認到齊才允許匯出 |
| `src/core/export.ts` | 同步產 PNG（保住使用者手勢）→ 系統分享／下載／長按存圖 |
| `src/templates/*.ts` | 四個模板（宣言／極簡／漸層／海報）：只負責排出文字區塊與畫背景；相對比例版面，換尺寸時重新排版；限時動態上 270px／下 340px 不放文字 |
| `src/core/palettes.ts` | 六組配色＋自訂背景／文字色；對比度計算（強調色在深底會調亮保留色相） |
| `e2e/harness.*` | 只在 dev 載入的測試頁，用真實字型量排版；不會進 dist |

### 儲存流程

1. 手機且支援 `navigator.share({ files })` → 系統分享選單（可「儲存影像」到相簿）
2. 桌面 → `<a download>`
3. 都不行（多半是 Threads／IG／FB／LINE 內建瀏覽器）→ 全螢幕顯示圖片，提示長按儲存，並提示改用瀏覽器開啟

PNG 用 `toDataURL` 在點擊當下同步產生：Safari 會在 `toBlob` 的非同步 callback 之後丟掉使用者手勢，導致 `share()` 失敗。

## 分享預覽圖

`public/og.png` 是橫向宣言版的預設圖卡。改了預設文字或宣言版樣式時要重新產生；換網域時要改 `index.html` 的 `og:url`／`og:image`。

## 隱私

- 無後端、無資料庫、無流量追蹤；不使用 localStorage／sessionStorage／IndexedDB，重新整理即清空。
- 圖卡完全在瀏覽器內產生，不上傳。
- **例外：字型由 Google Fonts 提供。** Google 可得知訪客 IP，以及載入了哪些字元切片（可大略推知輸入內容包含哪些字群）。
- Cloudflare Pages 可能保留基本存取日誌（不含編輯內容）。
- `public/_headers` 的 CSP 只允許連線到本站與 Google Fonts，用技術手段保證沒有其他對外連線。

## 部署（Cloudflare Workers 靜態資源，連 GitHub 自動部署）

- Build command：`npm run build`（會先依 lockfile 自動安裝）
- Deploy command：`npx wrangler deploy`（讀 `wrangler.jsonc`，只發佈 `dist/`）
- Node 版本：`.nvmrc` 指定 22（Vite 8 需要 ≥ 20.19）
- Output directory：`dist`
- `public/_headers` 會被複製到 `dist/`，由 Cloudflare 套用 CSP 等 header。

## 實機驗收清單

自動測試無法涵蓋以下情境，每次發版前需用手機實測：

- [ ] iPhone Safari：儲存／分享 → 儲存影像 → 相簿裡有圖、無裁切
- [ ] Android Chrome：同上
- [ ] Threads 內建瀏覽器：能存圖，或出現長按存圖畫面
- [ ] Instagram、LINE、Facebook 內建瀏覽器：同上
- [ ] 注音輸入選字過程中預覽不亂跳、不吃字
