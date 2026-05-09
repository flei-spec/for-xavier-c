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

// In production, songs live on R2 — if CDN_BASE is empty they 404 on Vercel.
// This fires immediately in the browser console so the missing env var is obvious.
if (!import.meta.env.DEV && !CDN_BASE) {
  console.error(
    '[Audio] ⚠️  VITE_CDN_BASE is not set.\n' +
    '  Songs will try to load from /songs/ which does not exist on Vercel.\n' +
    '  Fix: Vercel Dashboard → Project → Settings → Environment Variables\n' +
    '  Add:  VITE_CDN_BASE = https://pub-df1f48ab69e14f6b9bb0f39061a69a27.r2.dev\n' +
    '  Then redeploy.'
  )
}

/**
 * Normalise a raw or pre-encoded song filename into a clean playback URL.
 *
 * Accepts the raw filename (e.g. "30年前，50年后 - 精卫.mp3") or the path
 * stored in songMoodMap ("/songs/30年前，50年后 - 精卫.mp3") in either raw or
 * already-percent-encoded form.
 *
 * Algorithm (idempotent — safe to call on raw OR pre-encoded input):
 *   1. Split on "/" to isolate each path segment.
 *   2. Decode each segment with decodeURIComponent → always land on raw text.
 *      try/catch protects against any malformed % sequence in the input.
 *   3. Re-encode each decoded segment with encodeURIComponent → exactly one
 *      level of encoding, no double-encoding of % signs.
 *   4. Prepend CDN_BASE when set, otherwise return the encoded local path
 *      (Vite dev server decodes %XX before looking up public/).
 *
 * Handles: spaces → %20, Chinese → %E5…, commas → %2C, ampersands → %26,
 *   apostrophes → %27, hashes → %23, non-breaking spaces → %C2%A0, etc.
 *   Parentheses ( ) are intentionally left un-encoded (RFC 3986 safe chars).
 *
 * Voice intros (/Voice-intros/*.m4a) never pass through this function.
 */
export function resolveSongUrl(src) {
  const DEV = import.meta.env.DEV

  // 1 + 2: split and decode each segment to reach raw text
  const decoded = src.split('/').map(seg => {
    try { return decodeURIComponent(seg) } catch { return seg }
  }).join('/')

  // 3: one clean encode pass
  const encoded = decoded.split('/').map(encodeURIComponent).join('/')

  if (!CDN_BASE) {
    if (DEV) {
      console.log('[Audio] src      :', src)
      console.log('[Audio] normalized:', decoded)
      console.log('[Audio] local     :', encoded)
    }
    return encoded
  }

  const url = `${CDN_BASE.replace(/\/$/, '')}${encoded}`
  if (DEV) {
    console.log('[Audio] src      :', src)
    console.log('[Audio] normalized:', decoded)
    console.log('[Audio] CDN       :', url)
  }
  return url
}

// ─────────────────────────────────────────────────────────────────────────────
//  Voice intros (public/Voice-intros/*.m4a) are small and stay on Vercel.
//  Only the MP3 library in public/songs/ moves to R2.
// ─────────────────────────────────────────────────────────────────────────────
