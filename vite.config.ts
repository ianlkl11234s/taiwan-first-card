import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 讓 `vite preview` 套用與 Cloudflare Pages 相同的 header，部署前就能抓到 CSP 違規
function pagesHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const line of readFileSync('public/_headers', 'utf8').split('\n')) {
    const m = line.match(/^\s+([\w-]+):\s*(.+)$/)
    if (m) headers[m[1]] = m[2]
  }
  return headers
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: { headers: pagesHeaders() },
})
