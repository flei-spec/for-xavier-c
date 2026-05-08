import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
        const dir = path.resolve(__dirname, 'public/songs')
        const files = fs.existsSync(dir)
          ? fs.readdirSync(dir).filter(f => /\.mp3$/i.test(f)).sort()
          : []
        return `export default ${JSON.stringify(files)}`
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), songsListPlugin()],
})
