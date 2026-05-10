#!/usr/bin/env node
/**
 * upload-to-r2-direct.js
 *
 * Uploads MP3s to Cloudflare R2 using the Cloudflare REST API directly.
 * Much more reliable than spawning wrangler per-file: one persistent HTTP/2
 * connection handles all 438 uploads without per-process auth overhead.
 *
 * Reads credentials from wrangler's stored OAuth token automatically —
 * no extra configuration needed if you've run `wrangler login`.
 *
 * Usage:
 *   node scripts/upload-to-r2-direct.js BUCKET ACCOUNT_ID [--skip-existing]
 *
 * Example:
 *   node scripts/upload-to-r2-direct.js xradio-music 2be10945991cf09ef437b5c96449bd56
 *   node scripts/upload-to-r2-direct.js xradio-music 2be10945991cf09ef437b5c96449bd56 --skip-existing
 */

import fs    from 'fs'
import path  from 'path'
import https from 'https'
import { readdir, readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { homedir } from 'os'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const BUCKET     = process.argv[2]
const ACCOUNT_ID = process.argv[3]
const SKIP       = process.argv.includes('--skip-existing')
const SONGS_DIR  = path.resolve(__dirname, '../public/songs')
// Lower concurrency avoids SSL "bad record mac" errors from concurrent large-body PUT requests
const CONCURRENCY = parseInt(process.env.CONCURRENCY ?? '2', 10)

if (!BUCKET || !ACCOUNT_ID) {
  console.error('Usage: node scripts/upload-to-r2-direct.js BUCKET ACCOUNT_ID [--skip-existing]')
  console.error('Example: node scripts/upload-to-r2-direct.js xradio-music 2be10945991cf09ef437b5c96449bd56')
  process.exit(1)
}

// ── Load OAuth token from wrangler config ─────────────────────────────────────

function loadWranglerToken() {
  const configPath = path.join(homedir(), 'Library/Preferences/.wrangler/config/default.toml')
  try {
    const raw = fs.readFileSync(configPath, 'utf8')
    const m   = raw.match(/^oauth_token\s*=\s*"([^"]+)"/m)
    return m?.[1] ?? null
  } catch {
    return null
  }
}

// ── Read CDN base (for --skip-existing HEAD checks) ───────────────────────────

function loadCdnBase() {
  try {
    const env = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8')
    const m   = env.match(/^VITE_CDN_BASE=(.+)$/m)
    return m?.[1]?.trim().replace(/\/$/, '') ?? ''
  } catch { return '' }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function request(options, body) {
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

function headExists(url) {
  return new Promise(resolve => {
    const req = https.request(url, { method: 'HEAD', timeout: 8000 }, r => resolve(r.statusCode === 200))
    req.on('error', () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
    req.end()
  })
}

// ── Upload one file via CF REST API ───────────────────────────────────────────

async function uploadFile(filename, token, cdnBase) {
  const filePath  = path.join(SONGS_DIR, filename)
  const objectKey = encodeURIComponent(`songs/${filename}`)

  // Skip if already on CDN
  if (SKIP && cdnBase) {
    const exists = await headExists(`${cdnBase}/songs/${filename}`)
    if (exists) return { filename, ok: true, skipped: true }
  }

  const body = await readFile(filePath)

  const res = await request(
    {
      hostname: 'api.cloudflare.com',
      path:     `/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${objectKey}`,
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

// ── Parallel queue ────────────────────────────────────────────────────────────

async function runWithConcurrency(tasks, limit) {
  const results = []
  let idx = 0

  async function worker() {
    while (idx < tasks.length) {
      const i   = idx++
      const res = await tasks[i]()

      const pad    = String(i + 1).padStart(3)
      const total  = String(tasks.length)
      const status = res.ok ? (res.skipped ? '–' : '✓') : '✗'
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

// ── Main ──────────────────────────────────────────────────────────────────────

const token = loadWranglerToken()
if (!token) {
  console.error('Could not find wrangler OAuth token. Run: wrangler login')
  process.exit(1)
}

const cdnBase = loadCdnBase()

const files = (await readdir(SONGS_DIR))
  .filter(f => /\.mp3$/i.test(f))
  .sort()

if (files.length === 0) {
  console.error(`No MP3 files found in ${SONGS_DIR}`)
  process.exit(1)
}

console.log('─'.repeat(68))
console.log(`  Bucket        : ${BUCKET}`)
console.log(`  Account       : ${ACCOUNT_ID}`)
console.log(`  Files         : ${files.length}`)
console.log(`  Concurrency   : ${CONCURRENCY} (direct API, no per-process overhead)`)
console.log(`  Skip existing : ${SKIP ? 'yes' : 'no'}`)
console.log('─'.repeat(68))
console.log()

const tasks   = files.map(f => () => uploadFile(f, token, cdnBase))
const results = await runWithConcurrency(tasks, CONCURRENCY)

const ok      = results.filter(r => r.ok && !r.skipped)
const skipped = results.filter(r => r.skipped)
const failed  = results.filter(r => !r.ok)

console.log()
console.log('─'.repeat(68))
console.log(`  ✓ Uploaded : ${ok.length} / ${files.length}`)
if (skipped.length) console.log(`  – Skipped  : ${skipped.length}  (already on R2)`)

if (failed.length > 0) {
  console.log(`  ✗ Failed   : ${failed.length}`)
  console.log()
  failed.forEach(r => console.log(`    ✗ ${r.filename}: ${r.error}`))
  console.log()
  console.log('  Re-run with --skip-existing to retry only failures')
} else {
  console.log()
  console.log('  All songs uploaded successfully!')
  if (cdnBase) console.log(`\n  Verify: ${cdnBase}/songs/${files[0]}`)
}

console.log('─'.repeat(68))
