#!/usr/bin/env node
/**
 * upload-to-r2.js
 *
 * Uploads every MP3 in songs_static/ to a Cloudflare R2 bucket.
 * Runs at CONCURRENCY=2 to stay well under R2's wrangler API rate limits.
 * Retries each failed upload up to MAX_RETRIES times with exponential back-off.
 * Files already on R2 (HTTP 200) are skipped to save time on re-runs.
 *
 * Requirements:
 *   npm install -g wrangler@latest    (one-time)
 *   wrangler login                    (one-time, opens browser)
 *
 * Usage:
 *   node scripts/upload-to-r2.js YOUR-BUCKET-NAME [--skip-existing]
 *
 * Example:
 *   node scripts/upload-to-r2.js xradio-music --skip-existing
 */

import { execFile }  from 'child_process'
import { promisify } from 'util'
import { readdir }   from 'fs/promises'
import { resolve, join, basename } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const exec      = promisify(execFile)
const __dirname = fileURLToPath(new URL('.', import.meta.url))

// ── Config ───────────────────────────────────────────────────────────────────

const BUCKET       = process.argv[2]
const SKIP         = process.argv.includes('--skip-existing')
const SONGS_DIR    = resolve(__dirname, '../songs_static')
const CONCURRENCY  = 2       // 2 concurrent wrangler processes — R2 API limit safe
const MAX_RETRIES  = 3       // retries per file with exponential back-off
const CONTENT_TYPE = 'audio/mpeg'

// ── Validation ────────────────────────────────────────────────────────────────

if (!BUCKET) {
  console.error('Error: bucket name is required.\n')
  console.error('Usage:   node scripts/upload-to-r2.js YOUR-BUCKET-NAME')
  console.error('Example: node scripts/upload-to-r2.js xradio-music --skip-existing')
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function headRequest(url) {
  return new Promise(resolve => {
    const req = https.request(url, { method: 'HEAD', timeout: 6000 }, res => {
      resolve(res.statusCode)
    })
    req.on('error', () => resolve(0))
    req.on('timeout', () => { req.destroy(); resolve(0) })
    req.end()
  })
}

// ── Upload one file (with retries) ────────────────────────────────────────────

async function uploadFile(filePath, cdnBase) {
  const name      = basename(filePath)
  const objectKey = `${BUCKET}/songs/${name}`

  // Optional: skip if already on R2
  if (SKIP && cdnBase) {
    const status = await headRequest(`${cdnBase}/songs/${name}`)
    if (status === 200) return { name, ok: true, skipped: true }
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await exec('wrangler', [
        'r2', 'object', 'put',
        objectKey,
        '--file', filePath,
        '--content-type', CONTENT_TYPE,
        '--remote',
      ])
      return { name, ok: true, attempt }
    } catch (err) {
      const isLast = attempt === MAX_RETRIES
      if (!isLast) {
        await sleep(1000 * attempt)   // 1s, 2s back-off before retry
      } else {
        return { name, ok: false, error: err.stderr?.split('\n')[0] ?? err.message }
      }
    }
  }
}

// ── Parallel queue ────────────────────────────────────────────────────────────

async function runWithConcurrency(tasks, limit) {
  const results = []
  let idx = 0

  async function worker() {
    while (idx < tasks.length) {
      const i    = idx++
      const task = tasks[i]
      const res  = await task()

      const pad    = String(i + 1).padStart(3)
      const total  = String(tasks.length)
      const status = res.ok ? (res.skipped ? '–' : '✓') : '✗'
      const suffix = res.skipped
        ? '(already on R2)'
        : res.attempt > 1
          ? `(attempt ${res.attempt})`
          : ''
      const label  = res.ok
        ? `${res.name}  ${suffix}`.trimEnd()
        : `${res.name}  ← ${res.error ?? 'unknown error'}`

      console.log(`  [${pad}/${total}] ${status}  ${label}`)
      results.push(res)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()))
  return results
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Read CDN base from .env.local for --skip-existing check
let cdnBase = ''
try {
  const env = (await import('fs')).readFileSync(
    resolve(__dirname, '../.env.local'), 'utf8'
  )
  const m = env.match(/^VITE_CDN_BASE=(.+)$/m)
  if (m) cdnBase = m[1].trim().replace(/\/$/, '')
} catch {}

const files = (await readdir(SONGS_DIR))
  .filter(f => /\.mp3$/i.test(f))
  .sort()

if (files.length === 0) {
  console.error(`No MP3 files found in ${SONGS_DIR}`)
  process.exit(1)
}

console.log('─'.repeat(68))
console.log(`  Bucket        : ${BUCKET}`)
console.log(`  Folder        : songs_static/`)
console.log(`  Files         : ${files.length}`)
console.log(`  Concurrency   : ${CONCURRENCY}`)
console.log(`  Max retries   : ${MAX_RETRIES}`)
console.log(`  Skip existing : ${SKIP ? 'yes' : 'no'}`)
console.log('─'.repeat(68))
console.log()

const tasks   = files.map(f => () => uploadFile(join(SONGS_DIR, f), cdnBase))
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
  console.log('  Failed files — re-run the script to retry:')
  failed.forEach(r => console.log(`    - ${r.name}`))
  console.log()
  console.log('  Or retry only failures:')
  console.log(`    node scripts/upload-to-r2.js ${BUCKET} --skip-existing`)
} else {
  console.log()
  console.log('  All songs uploaded!')
  if (cdnBase) {
    console.log()
    console.log('  Verify a file:')
    console.log(`  ${cdnBase}/songs/${files[0]}`)
  }
}

console.log('─'.repeat(68))
