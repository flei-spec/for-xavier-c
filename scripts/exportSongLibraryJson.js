// One-time script: exports songMoodMap.js → public/data/songLibrary.json
// Future additions are handled automatically by generateSongMoodMap.js
import { songMoodMap } from '../src/data/songMoodMap.js'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/data')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'songLibrary.json'), JSON.stringify(songMoodMap))
console.log(`✓ Wrote ${songMoodMap.length} songs → public/data/songLibrary.json`)
