#!/usr/bin/env node
/**
 * upload-to-r2.js
 *
 * Uploads every MP3 in public/songs/ to a Cloudflare R2 bucket using Wrangler CLI.
 * Runs up to CONCURRENCY uploads in parallel so 438 files finish in ~2-3 minutes
 * instead of the ~15 minutes a sequential shell loop would take.
 *
 * Requirements:
 *   npm install -g wrangler@latest    (one-time)
 *   wrangler login                    (one-time, opens browser)
 *
 * Usage:
 *   node scripts/upload-to-r2.js YOUR-BUCKET-NAME
 *
 * Example:
 *   node scripts/upload-to-r2.js xavier-radio-music
 */

import { execFile }  from 'child_process'
import { promisify } from 'util'
import { readdir }   from 'fs/promises'
import { resolve, join, basename } from 'path'
import { fileURLToPath } from 'url'

const exec      = promisify(execFile)
const __dirname = fileURLToPath(new URL('.', import.meta.url))

// ── Config ───────────────────────────────────────────────────────────────────

const BUCKET      = process.argv[2]
const SONGS_DIR   = resolve(__dirname, '../public/songs')
const CONCURRENCY = 8          // parallel wrangler processes (safe for R2 API limits)
const CONTENT_TYPE = 'audio/mpeg'

// ── Validation ────────────────────────────────────────────────────────────────

if (!BUCKET) {
  console.error('Error: bucket name is required.\n')
  console.error('Usage:   node scripts/upload-to-r2.js YOUR-BUCKET-NAME')
  console.error('Example: node scripts/upload-to-r2.js xavier-radio-music')
  process.exit(1)
}

// ── Upload one file via wrangler ──────────────────────────────────────────────

async function uploadFile(filePath) {
  const name      = basename(filePath)
  const objectKey = `${BUCKET}/songs/${name}`   // bucket/key format wrangler expects

  try {
    await exec('wrangler', [
      'r2', 'object', 'put',
      objectKey,
      '--file', filePath,
      '--content-type', CONTENT_TYPE,
    ])
    return { name, ok: true }
  } catch (err) {
    return { name, ok: false, error: err.stderr || err.message }
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
      const status = res.ok ? '✓' : '✗'
      const label  = res.ok ? res.name : `${res.name}  ← ${res.error?.split('\n')[0] ?? 'unknown error'}`
      console.log(`  [${pad}/${total}] ${status}  ${label}`)

      results.push(res)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()))
  return results
}

// ── Main ──────────────────────────────────────────────────────────────────────

const files = (await readdir(SONGS_DIR))
  .filter(f => /\.mp3$/i.test(f))
  .sort()

if (files.length === 0) {
  console.error(`No MP3 files found in ${SONGS_DIR}`)
  process.exit(1)
}

console.log('─'.repeat(68))
console.log(`  Bucket : ${BUCKET}`)
console.log(`  Folder : public/songs/`)
console.log(`  Files  : ${files.length}`)
console.log(`  Threads: ${CONCURRENCY}`)
console.log('─'.repeat(68))
console.log()

const tasks   = files.map(f => () => uploadFile(join(SONGS_DIR, f)))
const results = await runWithConcurrency(tasks, CONCURRENCY)

const ok     = results.filter(r => r.ok)
const failed = results.filter(r => !r.ok)

console.log()
console.log('─'.repeat(68))
console.log(`  ✓ Uploaded : ${ok.length} / ${files.length}`)

if (failed.length > 0) {
  console.log(`  ✗ Failed   : ${failed.length}`)
  console.log()
  console.log('  Failed files (re-run the script to retry):')
  failed.forEach(r => console.log(`    - ${r.name}`))
} else {
  console.log()
  console.log('  All songs uploaded successfully!')
  console.log()
  console.log('  Next step: verify a file in your browser:')
  const sample = encodeURIComponent(files[0])
  console.log(`  https://YOUR-R2-PUBLIC-URL.r2.dev/songs/${sample}`)
}

console.log('─'.repeat(68))
