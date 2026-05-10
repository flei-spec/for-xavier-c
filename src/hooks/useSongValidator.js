import { useState, useEffect } from 'react'

const BATCH_SIZE   = 10    // parallel HEAD requests per batch
const TIMEOUT_MS   = 6000  // per-request abort timeout

/**
 * Validate a list of songs against the actual CDN/local server.
 *
 * IMPORTANT: `songs` must come from getStationSongs(), which already calls
 * resolveSongUrl() on every entry.  Do NOT call resolveSongUrl() again here —
 * double-resolving with a CDN base produces broken URLs like:
 *   https://pub-xxx.r2.devhttps://pub-xxx.r2.dev/songs/foo.mp3
 *
 * Fires HEAD requests (batches of BATCH_SIZE) using the src value as-is.
 * Songs that return non-2xx or time out are added to `invalidSrcs` and
 * filtered from the playable queue by the caller.
 *
 * The effect re-runs only when the `songs` array identity changes — callers
 * must memoize with useMemo to prevent redundant runs.
 *
 * @param {Array<{src: string}>} songs  — already-resolved, memoized per mood
 * @returns {Set<string>}               — resolved src values that are unreachable
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
          // src is already the resolved CDN or local URL — use it directly
          try {
            const ctrl = new AbortController()
            const t    = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
            const res  = await fetch(src, { method: 'HEAD', signal: ctrl.signal })
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
