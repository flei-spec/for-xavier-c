import { useState, useEffect } from 'react'
import { resolveSongUrl } from '../data/songConfig'

// Module-level cache — fetched once per browser session, shared across all hook instances
let _cache = null
let _promise = null

function startFetch() {
  if (_promise) return
  _promise = fetch('/data/songLibrary.json')
    .then(r => r.json())
    .then(data => {
      _cache = data.map(s => ({ ...s, src: resolveSongUrl(s.src) }))
      return _cache
    })
    .catch(err => {
      _promise = null  // allow retry on transient failure
      throw err
    })
}

/**
 * Call this as early as possible (e.g. when entering the mood selector) so
 * the library is fully cached before RadioStation mounts.  Safe to call
 * multiple times — the fetch only fires once per session.
 */
export function preloadSongLibrary() {
  startFetch()
}

/**
 * Lazily fetches the full 438-song library from /data/songLibrary.json.
 * The JSON is fetched once, URL-resolved, and cached for the session.
 * If preloadSongLibrary() was already called and the fetch completed,
 * useState(_cache) returns the full library on the very first render
 * with no loading delay.
 */
export function useSongLibrary() {
  const [library, setLibrary] = useState(_cache)
  const [loading, setLoading] = useState(_cache === null)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    if (_cache !== null) {
      // Already cached — nothing to do (useState already holds it)
      if (loading) setLoading(false)
      return
    }
    startFetch()
    let live = true
    _promise
      .then(data => { if (live) { setLibrary(data); setLoading(false) } })
      .catch(() => { if (live) { setLoading(false); setError(true) } })
    return () => { live = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { library: library ?? [], loading, error }
}
