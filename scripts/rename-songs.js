/**
 * rename-songs.js
 *
 * Renames every file in songs_static/ to a Safari-safe kebab-case ASCII name
 * and updates the corresponding src field in src/data/songMoodMap.js.
 *
 * Usage:
 *   node scripts/rename-songs.js [--dry-run]
 *
 * --dry-run  Print the rename plan without touching any files.
 *
 * After this script completes:
 *   • Local files in songs_static/ have safe ASCII names.
 *   • songMoodMap.js src fields are updated to match.
 *   • Re-upload to Cloudflare R2:
 *       node scripts/upload-to-r2.js YOUR-BUCKET-NAME
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { songMoodMap }   from '../src/data/songMoodMap.js'
import { buildSongSlug } from '../src/utils/sanitizeFilename.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const songsDir  = path.resolve(__dirname, '../songs_static')
const mapFile   = path.resolve(__dirname, '../src/data/songMoodMap.js')
const DRY       = process.argv.includes('--dry-run')

// ── Build rename plan ─────────────────────────────────────────────────────────

const usedSlugs = new Map()   // slug → count (for collision resolution)
const plan      = []          // [{ oldBase, newBase, oldPath, newPath }]

for (let i = 0; i < songMoodMap.length; i++) {
  const { artist, title, src } = songMoodMap[i]
  const oldBase = src.replace(/^\/songs\//, '').replace(/\.mp3$/i, '')

  let slug = buildSongSlug(artist, title, i)

  // Resolve collisions — e.g. two versions of the same song
  if (usedSlugs.has(slug)) {
    const n = usedSlugs.get(slug) + 1
    usedSlugs.set(slug, n)
    slug = `${slug}-${n}`
  } else {
    usedSlugs.set(slug, 1)
  }

  plan.push({
    oldBase,
    newBase: slug,
    oldPath: path.join(songsDir, `${oldBase}.mp3`),
    newPath: path.join(songsDir, `${slug}.mp3`),
  })
}

// ── Print plan ────────────────────────────────────────────────────────────────

const unchanged = plan.filter(p => p.oldBase === p.newBase)
const toRename  = plan.filter(p => p.oldBase !== p.newBase)

console.log(`\n${'─'.repeat(70)}`)
console.log(`Rename plan — ${toRename.length} files to rename, ${unchanged.length} already clean`)
if (DRY) console.log('(DRY RUN — no files will be touched)\n')
else      console.log()

for (const { oldBase, newBase } of toRename) {
  console.log(`  ${oldBase}`)
  console.log(`  → ${newBase}\n`)
}

if (DRY) {
  console.log('─'.repeat(70))
  console.log('Re-run without --dry-run to apply.\n')
  process.exit(0)
}

// ── Execute renames ───────────────────────────────────────────────────────────

let renamed = 0
let missing = 0
let skipped = 0

for (const { oldBase, newBase, oldPath, newPath } of plan) {
  if (oldBase === newBase) { skipped++; continue }

  if (!fs.existsSync(oldPath)) {
    console.warn(`⚠  Not found on disk (map-only): ${oldBase}.mp3`)
    missing++
    continue
  }

  try {
    fs.renameSync(oldPath, newPath)
    renamed++
  } catch (err) {
    console.error(`✗  Failed: ${oldBase}.mp3 → ${newBase}.mp3  (${err.message})`)
  }
}

// ── Rewrite songMoodMap.js src fields ─────────────────────────────────────────

let source = fs.readFileSync(mapFile, 'utf8')

for (const { oldBase, newBase } of plan) {
  if (oldBase === newBase) continue
  // Replace exactly the src string value — works even with Chinese chars
  source = source.split(`"/songs/${oldBase}.mp3"`).join(`"/songs/${newBase}.mp3"`)
}

fs.writeFileSync(mapFile, source, 'utf8')

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`${'─'.repeat(70)}`)
console.log(`✓  Renamed ${renamed} files`)
if (missing) console.log(`⚠  Skipped ${missing} map entries whose file was not found on disk`)
if (skipped) console.log(`=  ${skipped} files already had clean names`)
console.log(`✓  Updated ${mapFile}`)
console.log()
console.log('Next step — sync renamed files to Cloudflare R2:')
console.log('  node scripts/upload-to-r2.js YOUR-BUCKET-NAME')
console.log(`${'─'.repeat(70)}\n`)
