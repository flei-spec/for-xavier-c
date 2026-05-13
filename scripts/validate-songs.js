/**
 * validate-songs.js
 *
 * Compares every src entry in songMoodMap.js against:
 *   (a) files actually on disk in songs_static/
 *   (b) optionally, HTTP HEAD requests to the CDN (when --check-cdn is passed)
 *
 * Usage:
 *   node scripts/validate-songs.js              # disk check only
 *   node scripts/validate-songs.js --check-cdn  # disk + CDN HEAD requests
 *
 * Exit code 1 if any mismatches are found.
 */

import fs   from 'fs'
import path from 'path'
import http  from 'http'
import https from 'https'
import { fileURLToPath } from 'url'
import { songMoodMap }   from '../src/data/songMoodMap.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const songsDir  = path.resolve(__dirname, '../songs_static')
const checkCDN  = process.argv.includes('--check-cdn')

// ── 1. Disk check ─────────────────────────────────────────────────────────────

const diskFiles = new Set(fs.readdirSync(songsDir).filter(f => /\.mp3$/i.test(f)))

let diskMissing   = 0
let diskOk        = 0
let badPathFormat = 0

console.log(`\n${'─'.repeat(72)}`)
console.log('Song path validation')
console.log(`${'─'.repeat(72)}`)
console.log(`\n[1/2] Checking disk: ${songsDir}\n`)

for (const { title, artist, src } of songMoodMap) {
  // Validate format: must be "/songs/filename.mp3"
  if (!src.startsWith('/songs/') || !src.endsWith('.mp3')) {
    console.error(`  ✗  BAD FORMAT  "${src}"  (${artist} – ${title})`)
    badPathFormat++
    continue
  }

  const filename = src.replace('/songs/', '')

  if (diskFiles.has(filename)) {
    diskOk++
  } else {
    console.error(`  ✗  MISSING ON DISK  ${src}  (${artist} – ${title})`)
    diskMissing++
  }
}

const diskStatus = diskMissing === 0 && badPathFormat === 0 ? '✓' : '✗'
console.log(`\n${diskStatus}  Disk check: ${diskOk} ok, ${diskMissing} missing, ${badPathFormat} bad format`)

// ── 2. Extra: files on disk but not in map ────────────────────────────────────

const mapFiles = new Set(songMoodMap.map(s => s.src.replace('/songs/', '')))
const orphans  = [...diskFiles].filter(f => !mapFiles.has(f))
if (orphans.length) {
  console.log(`\n⚠  On disk but not referenced in map (${orphans.length}):`)
  orphans.forEach(f => console.log(`     ${f}`))
}

// ── 3. Optional CDN check ─────────────────────────────────────────────────────

if (!checkCDN) {
  console.log('\n(Pass --check-cdn to also validate CDN URLs with HEAD requests)\n')
  process.exit(diskMissing || badPathFormat ? 1 : 0)
}

// Read CDN base from environment (requires .env.local or exported var)
const cdnBase = process.env.VITE_CDN_BASE?.trim() ?? ''
if (!cdnBase) {
  console.log('\n⚠  VITE_CDN_BASE is not set — skipping CDN check\n')
  process.exit(diskMissing || badPathFormat ? 1 : 0)
}

function head(url) {
  return new Promise(resolve => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.request(url, { method: 'HEAD', timeout: 8000 }, res => {
      resolve({ status: res.statusCode })
    })
    req.on('error', err => resolve({ status: 0, error: err.message }))
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }) })
    req.end()
  })
}

console.log(`\n[2/2] Checking CDN: ${cdnBase}\n`)

let cdnOk = 0
let cdnMissing = 0
const CDN = cdnBase.replace(/\/$/, '')

for (const { title, artist, src } of songMoodMap) {
  const url = `${CDN}${src}`
  const { status, error } = await head(url)

  if (status === 200) {
    cdnOk++
  } else {
    const reason = error ?? `HTTP ${status}`
    console.error(`  ✗  CDN ${reason.padStart(10)}  ${src}  (${artist} – ${title})`)
    cdnMissing++
  }
}

const cdnStatus = cdnMissing === 0 ? '✓' : '✗'
console.log(`\n${cdnStatus}  CDN check: ${cdnOk} ok, ${cdnMissing} missing`)

if (cdnMissing > 0) {
  console.log(`\n  Fix: upload renamed files to R2:`)
  console.log(`    node scripts/upload-to-r2.js YOUR-BUCKET-NAME\n`)
}

process.exit((diskMissing || badPathFormat || cdnMissing) ? 1 : 0)
