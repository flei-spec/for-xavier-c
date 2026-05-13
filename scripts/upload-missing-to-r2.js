#!/usr/bin/env node
/**
 * upload-missing-to-r2.js
 *
 * Syncs missing MP3s to Cloudflare R2 using the wrangler CLI.
 * HEAD-checks each file against the CDN first (with proper URL encoding),
 * then only uploads what's missing.
 */

import { execFile }  from 'child_process'
import { promisify } from 'util'
import { readdir, readFile } from 'fs/promises'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const exec      = promisify(execFile)
const __dirname = fileURLToPath(new URL('.', import.meta.url))

const BUCKET     = 'xradio-music'
const CDN_BASE   = 'https://pub-df1f48ab69e14f6b9bb0f39061a69a27.r2.dev'
const SONGS_DIR  = resolve(__dirname, '../songs_static')
const CONCURRENCY = 1  // single-threaded — wrangler CLI handles its own auth
const MAX_RETRIES = 3

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function headExists(encodedUrl) {
  return new Promise(resolve => {
    const opts = new URL(encodedUrl)
    const req = https.request(
      { hostname: opts.hostname, path: opts.pathname + opts.search, method: 'HEAD', timeout: 10000 },
      r => { r.resume(); resolve(r.statusCode === 200) }
    )
    req.on('error', () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
    req.end()
  })
}

async function uploadWithWrangler(filename) {
  const filePath = resolve(SONGS_DIR, filename)
  const objectKey = `${BUCKET}/songs/${filename}`

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await exec('wrangler', [
        'r2', 'object', 'put', objectKey,
        '--file', filePath,
        '--content-type', 'audio/mpeg',
        '--remote',
      ], { timeout: 120000 })
      return { filename, ok: true, attempt }
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        return { filename, ok: false, error: err.stderr?.slice(0, 200) ?? err.message }
      }
      console.log(`    Retry ${attempt + 1}/${MAX_RETRIES} for ${filename}...`)
      await sleep(2000 * attempt)
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const allFiles = (await readdir(SONGS_DIR)).filter(f => /\.mp3$/i.test(f)).sort()

console.log(`\nScanning ${allFiles.length} files against CDN...`)

// Check all files — reasonable batch size
const BATCH = 15
const missing = []

for (let i = 0; i < allFiles.length; i += BATCH) {
  const batch = allFiles.slice(i, i + BATCH)
  const results = await Promise.all(batch.map(async f => {
    const encoded = '/songs/' + f.split('/').map(s => encodeURIComponent(s)).join('/')
    const url = CDN_BASE + encoded
    return { f, exists: await headExists(url) }
  }))
  for (const r of results) {
    if (!r.exists) missing.push(r.f)
  }
  const done = Math.min(i + BATCH, allFiles.length)
  process.stdout.write(`\r  ${done}/${allFiles.length} — ${allFiles.length - missing.length} found, ${missing.length} missing`)
}
console.log('\n')

if (missing.length === 0) {
  console.log('All files already on R2.')
  process.exit(0)
}

console.log(`Missing from R2: ${missing.length} files\n`)
missing.forEach(f => console.log(`  ✗  ${f}`))
console.log()

// Upload missing files
console.log(`Uploading ${missing.length} files (concurrency=${CONCURRENCY})...\n`)

let uploaded = 0
let failed = 0
const failures = []

for (let i = 0; i < missing.length; i++) {
  const f = missing[i]
  const pad = String(i + 1).padStart(2)
  process.stdout.write(`  [${pad}/${missing.length}] Uploading ${f.slice(0, 70)}... `)
  const result = await uploadWithWrangler(f)
  if (result.ok) {
    uploaded++
    const tag = result.attempt > 1 ? ` (retry ${result.attempt})` : ''
    console.log(`✓${tag}`)
  } else {
    failed++
    failures.push(result)
    console.log(`✗ ${result.error?.slice(0, 100)}`)
  }
  // Small delay between uploads to avoid rate limits
  await sleep(500)
}

console.log()
console.log('─'.repeat(68))
console.log(`  ✓ Uploaded : ${uploaded}`)
console.log(`  ✗ Failed   : ${failed}`)
if (failures.length) {
  console.log()
  console.log('  Failed files:')
  failures.forEach(r => console.log(`    - ${r.filename}`))
}
console.log('─'.repeat(68))

// Spot-check
if (uploaded > 0) {
  console.log()
  console.log('Verifying spot-check...')
  const test = missing.find(f => !failures.some(fl => fl.filename === f))
  if (test) {
    const encoded = '/songs/' + test.split('/').map(s => encodeURIComponent(s)).join('/')
    const verifyUrl = CDN_BASE + encoded
    const ok = await headExists(verifyUrl)
    console.log(`  ${ok ? '✓' : '✗'}  ${verifyUrl}`)
  }
}
