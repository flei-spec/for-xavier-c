import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Songs live outside public/ so Vercel doesn't scan 4.6GB of MP3s during deploy.
// In production, audio streams from Cloudflare R2 (VITE_CDN_BASE).
const SONGS_DIR = path.resolve(__dirname, 'songs_static')

function songsListPlugin() {
  const virtualId = 'virtual:songs-list'
  const resolvedId = '\0' + virtualId

  return {
    name: 'songs-list',
    resolveId(id) {
      if (id === virtualId) return resolvedId
    },
    load(id) {
      if (id === resolvedId) {
        const files = fs.existsSync(SONGS_DIR)
          ? fs.readdirSync(SONGS_DIR).filter(f => /\.mp3$/i.test(f)).sort()
          : []
        return `export default ${JSON.stringify(files)}`
      }
    },
  }
}

// Dev-only: serve /songs/ from songs_static/ when CDN_BASE is not set
function serveSongsPlugin() {
  return {
    name: 'serve-songs',
    configureServer(server) {
      server.middlewares.use('/songs', (req, res, next) => {
        const filePath = path.join(SONGS_DIR, decodeURIComponent(req.url))
        if (fs.existsSync(filePath)) {
          const ext = path.extname(filePath).toLowerCase()
          const types = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav' }
          res.setHeader('Content-Type', types[ext] || 'application/octet-stream')
          fs.createReadStream(filePath).pipe(res)
        } else {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), songsListPlugin(), serveSongsPlugin()],

  // Strip console.log / console.info / console.debug from production bundles.
  // esbuild treats them as "pure" (no side-effects) so they are removed during
  // minification when their return values are unused.
  // console.warn and console.error are intentionally kept for error visibility.
  esbuild: {
    pure: ['console.log', 'console.info', 'console.debug'],
  },
})
