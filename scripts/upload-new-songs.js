#!/usr/bin/env node
/**
 * upload-new-songs.js
 *
 * Uploads ONLY the newly added songs (the 61 Chinese/special-char named files)
 * to Cloudflare R2 using the REST API directly.
 *
 * Key design decision: object keys are RAW filenames (not encodeURIComponent'd).
 * R2 decodes incoming request paths before key lookup, so the key must match
 * the decoded form.  resolveSongUrl() encodeURIComponent's the path for the
 * browser request; R2 decodes it back to the raw key on lookup.
 *
 * Usage:
 *   node scripts/upload-new-songs.js
 */

import fs    from 'fs'
import path  from 'path'
import https from 'https'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { homedir } from 'os'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))

// ── Config ───────────────────────────────────────────────────────────────────
const BUCKET     = 'xradio-music'
const ACCOUNT_ID = '2be10945991cf09ef437b5c96449bd56'
const CDN_BASE   = 'https://pub-df1f48ab69e14f6b9bb0f39061a69a27.r2.dev'
const SONGS_DIR  = path.resolve(__dirname, '../songs_static')
const LIBRARY_JSON = path.resolve(__dirname, '../public/data/songLibrary.json')
const CONCURRENCY = 2

// ── Load wrangler OAuth token ────────────────────────────────────────────────
function loadWranglerToken() {
  const configPath = path.join(homedir(), 'Library/Preferences/.wrangler/config/default.toml')
  try {
    const raw = fs.readFileSync(configPath, 'utf8')
    const m   = raw.match(/^oauth_token\s*=\s*"([^"]+)"/m)
    return m?.[1] ?? null
  } catch { return null }
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────
function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      const chunks = []
      res.on('data', d => chunks.push(d))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

function headExists(encodedUrl) {
  return new Promise(resolve => {
    const opts = new URL(encodedUrl)
    const req = https.request(
      { hostname: opts.hostname, path: opts.pathname, method: 'HEAD', timeout: 8000 },
      r => resolve(r.statusCode === 200)
    )
    req.on('error', () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
    req.end()
  })
}

// ── Upload one file ──────────────────────────────────────────────────────────
async function uploadFile(filename, token) {
  const filePath = path.join(SONGS_DIR, filename)

  // Key = raw filename under songs/ prefix (no encodeURIComponent).
  // Example: "songs/蔡琴 - 南屏晚钟 (Remastered).mp3"
  const objectKey = `songs/${filename}`

  // HEAD check: encode the filename in the URL so the request is valid
  const encodedPath = '/songs/' + filename.split('/').map(s => encodeURIComponent(s)).join('/')
  const cdnUrl = `${CDN_BASE}${encodedPath}`

  const exists = await headExists(cdnUrl)
  if (exists) return { filename, ok: true, skipped: true }

  const body = await readFile(filePath)

  // Upload with raw key — R2 will decode incoming requests to match this.
  // Encode each segment separately so "songs/" stays as literal slash.
  const keyParts = objectKey.split('/')
  const encodedKey = keyParts.map(p => encodeURIComponent(p)).join('/')

  const res = await httpsRequest(
    {
      hostname: 'api.cloudflare.com',
      path:     `/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodedKey}`,
      method:   'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'audio/mpeg',
        'Content-Length': body.length,
      },
      timeout: 30000,
    },
    body
  ).catch(err => ({ status: 0, body: err.message }))

  if (res.status === 200 || res.status === 201 || res.status === 204) {
    return { filename, ok: true }
  }
  return { filename, ok: false, error: `HTTP ${res.status}: ${res.body.slice(0, 120)}` }
}

// ── Parallel queue ───────────────────────────────────────────────────────────
async function runWithConcurrency(tasks, limit) {
  const results = []
  let idx = 0

  async function worker() {
    while (idx < tasks.length) {
      const i   = idx++
      const res = await tasks[i]()

      const pad    = String(i + 1).padStart(2)
      const total  = String(tasks.length)
      const status = res.ok ? (res.skipped ? '⏭' : '✓') : '✗'
      const suffix = res.skipped ? '(already on R2)' : ''
      const label  = res.ok
        ? `${res.filename}  ${suffix}`.trimEnd()
        : `${res.filename}  ← ${res.error}`

      console.log(`  [${pad}/${total}] ${status}  ${label}`)
      results.push(res)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()))
  return results
}

// ── Main ─────────────────────────────────────────────────────────────────────
const token = loadWranglerToken()
if (!token) {
  console.error('Could not find wrangler OAuth token. Run: wrangler login')
  process.exit(1)
}

// Scan ALL files on disk, identify which are missing from R2
const allFiles = fs.readdirSync(SONGS_DIR).filter(f => /\.mp3$/i.test(f)).sort()

console.log('─'.repeat(68))
console.log(`  Bucket        : ${BUCKET}`)
console.log(`  Account       : ${ACCOUNT_ID}`)
console.log(`  CDN base      : ${CDN_BASE}`)
console.log(`  Files on disk : ${allFiles.length}`)
console.log(`  Concurrency   : ${CONCURRENCY}`)
console.log('─'.repeat(68))
console.log()

// First pass: HEAD check ALL files against R2 (encode URLs properly)
console.log('Checking R2 for existing files...\n')

// Batch HEAD checks for speed
const BATCH = 10
const headResults = []
for (let i = 0; i < allFiles.length; i += BATCH) {
  const batch = allFiles.slice(i, i + BATCH)
  const batchResults = await Promise.all(
    batch.map(async f => {
      const encodedPath = '/songs/' + f.split('/').map(s => encodeURIComponent(s)).join('/')
      const cdnUrl = `${CDN_BASE}${encodedPath}`
      const exists = await headExists(cdnUrl)
      return { filename: f, exists }
    })
  )
  headResults.push(...batchResults)
  // Progress
  const done = Math.min(i + BATCH, allFiles.length)
  const found = headResults.filter(r => r.exists).length
  const missing = headResults.filter(r => !r.exists).length
  process.stdout.write(`\r  Scanned ${done}/${allFiles.length} — ${found} found, ${missing} missing`)
}
console.log()

const alreadyThere = headResults.filter(r => r.exists)
const needUpload   = headResults.filter(r => !r.exists)

console.log()
console.log(`  Already on R2 : ${alreadyThere.length}`)
console.log(`  Need upload   : ${needUpload.length}`)
if (needUpload.length > 0) {
  console.log()
  needUpload.forEach(r => console.log(`    ✗  ${r.filename}`))
}
console.log()

if (needUpload.length === 0) {
  console.log('All songs are already on R2 — nothing to upload.')
  process.exit(0)
}

// Upload missing files
console.log(`Uploading ${needUpload.length} missing files...\n`)
const tasks = needUpload.map(r => () => uploadFile(r.filename, token))
const results = await runWithConcurrency(tasks, CONCURRENCY)

const ok     = results.filter(r => r.ok && !r.skipped)
const skipped = results.filter(r => r.skipped)
const failed = results.filter(r => !r.ok)

console.log()
console.log('─'.repeat(68))
console.log(`  ✓ Uploaded : ${ok.length} / ${needUpload.length}`)
if (skipped.length) console.log(`  ⏭ Skipped  : ${skipped.length}`)

if (failed.length > 0) {
  console.log(`  ✗ Failed   : ${failed.length}`)
  failed.forEach(r => console.log(`    ✗ ${r.filename}: ${r.error}`))
} else {
  console.log()
  console.log('  All missing songs uploaded successfully!')
}

// Verify: spot-check a few uploaded files
if (ok.length > 0) {
  console.log()
  console.log('  Spot-checking uploaded files...')
  const samples = ok.slice(0, 3)
  for (const s of samples) {
    const encodedPath = '/songs/' + s.filename.split('/').map(seg => encodeURIComponent(seg)).join('/')
    const verifyUrl = `${CDN_BASE}${encodedPath}`
    const ok2 = await headExists(verifyUrl)
    console.log(`    ${ok2 ? '✓' : '✗'}  ${verifyUrl}`)
  }
}

console.log('─'.repeat(68))
