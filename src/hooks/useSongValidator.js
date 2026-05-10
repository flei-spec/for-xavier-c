import { useState, useEffect } from 'react'
import { resolveSongUrl } from '../data/songConfig'

const BATCH_SIZE   = 10    // parallel HEAD requests per batch
const TIMEOUT_MS   = 6000  // per-request abort timeout

/**
 * Validate a list of songs against the actual CDN/local server.
 *
 * Fires HEAD requests in batches of BATCH_SIZE.  Songs that return a non-2xx
 * status or time out are collected in `invalidSrcs` (keyed by the raw src
 * from songMoodMap, e.g. "/songs/track-0298.mp3").
 *
 * The effect re-runs only when `songs` identity changes — callers must
 * memoize the array (e.g. via useMemo) to avoid redundant validation runs.
 *
 * @param {Array<{src: string}>} songs  — memoized, stable reference per mood
 * @returns {Set<string>}               — raw src values that are unreachable
 */
export function useSongValidator(songs) {
  const [invalidSrcs, setInvalidSrcs] = useState(() => new Set())

  useEffect(() => {
    if (!songs?.length) return

    // Reset results from the previous mood before starting a fresh check
    setInvalidSrcs(new Set())

    let cancelled = false
    const found = []

    async function checkBatch(batch) {
      await Promise.allSettled(
        batch.map(async ({ src }) => {
          const url = resolveSongUrl(src)
          try {
            const ctrl = new AbortController()
            const t    = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
            const res  = await fetch(url, { method: 'HEAD', signal: ctrl.signal })
            clearTimeout(t)
            if (!res.ok) {
              found.push(src)
              console.warn(`[SongValidator] missing (HTTP ${res.status}): ${src}`)
            }
          } catch {
            found.push(src)
            console.warn(`[SongValidator] unreachable (timeout/network): ${src}`)
          }
        })
      )
    }

    async function run() {
      for (let i = 0; i < songs.length; i += BATCH_SIZE) {
        if (cancelled) break
        await checkBatch(songs.slice(i, i + BATCH_SIZE))
      }

      if (!cancelled && found.length) {
        console.warn(`[SongValidator] ${found.length}/${songs.length} songs unreachable — removing from queue`)
        setInvalidSrcs(new Set(found))
      } else if (!cancelled) {
        console.log(`[SongValidator] all ${songs.length} songs reachable`)
      }
    }

    run()
    return () => { cancelled = true }
  }, [songs])

  return invalidSrcs
}
