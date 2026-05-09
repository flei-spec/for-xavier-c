// ─────────────────────────────────────────────────────────────────────────────
//  Song source configuration
//  Controls where audio files are streamed from: local /songs/ or Cloudflare R2
// ─────────────────────────────────────────────────────────────────────────────
//
//  HOW IT WORKS
//  ─────────────
//  CDN_BASE is read from the VITE_CDN_BASE environment variable at build time.
//
//  ┌──────────────────────────────────────────────────────────────────────────┐
//  │  Local dev  — leave .env.local empty (or don't create it at all)         │
//  │               songs load from   /songs/foo.mp3   (Vite public directory) │
//  │                                                                            │
//  │  Production — set VITE_CDN_BASE in the Vercel dashboard:                 │
//  │    Dashboard → Project → Settings → Environment Variables                │
//  │    Key:    VITE_CDN_BASE                                                  │
//  │    Value:  https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev            │
//  │               songs load from   https://pub-xxx.r2.dev/songs/foo.mp3    │
//  └──────────────────────────────────────────────────────────────────────────┘
//
//  QUICK LOCAL OVERRIDE (optional)
//  ─────────────────────────────────
//  To test CDN playback locally before deploying:
//    1. Copy .env.example  →  .env.local
//    2. Paste your R2 public URL after the = sign
//    3. Restart the dev server (npm run dev)
//  Your .env.local is gitignored — it will never be committed.
//
// ─────────────────────────────────────────────────────────────────────────────

// ▼▼▼  PASTE YOUR CLOUDFLARE R2 PUBLIC URL HERE FOR LOCAL TESTING  ▼▼▼
//
//   export const CDN_BASE = 'https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev'
//
//   Or better: set it in .env.local so this file stays clean:
//   VITE_CDN_BASE=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
//
// ▲▲▲──────────────────────────────────────────────────────────────────▲▲▲

export const CDN_BASE = (import.meta.env.VITE_CDN_BASE ?? '').trim()

/**
 * Resolve a song src path to a final, correctly-encoded playback URL.
 *
 * Handles both raw paths  ("/songs/foo bar.mp3")  and already-encoded paths
 * ("/songs/foo%20bar.mp3") without double-encoding.  The strategy is:
 *   1. Decode each segment with decodeURIComponent  →  raw filename
 *   2. Re-encode with encodeURIComponent            →  exactly one level of encoding
 *
 * This makes the function idempotent: calling it on an already-encoded src
 * produces the same result as calling it on the raw src.
 *
 * Handles: spaces, Chinese chars, commas, ampersands, non-breaking spaces, etc.
 * Parentheses ( ) are kept un-encoded — they are RFC 3986 safe path chars.
 * Voice intros (/Voice-intros/*.m4a) never pass through here.
 */
export function resolveSongUrl(src) {
  // Step 1 — normalise: decode each segment so we always start from raw text.
  // try/catch guards against any malformed % sequences in the input.
  const decoded = src.split('/').map(seg => {
    try { return decodeURIComponent(seg) } catch { return seg }
  }).join('/')

  // Step 2 — encode: one clean pass with encodeURIComponent.
  const encoded = decoded.split('/').map(encodeURIComponent).join('/')

  console.log('[Audio] src      :', src)
  console.log('[Audio] normalized:', decoded)

  if (!CDN_BASE) {
    console.log('[Audio] local     :', encoded)
    return encoded
  }

  const url = `${CDN_BASE.replace(/\/$/, '')}${encoded}`
  console.log('[Audio] CDN       :', url)
  return url
}

// ─────────────────────────────────────────────────────────────────────────────
//  Voice intros (public/Voice-intros/*.m4a) are small and stay on Vercel.
//  Only the MP3 library in public/songs/ moves to R2.
// ─────────────────────────────────────────────────────────────────────────────
