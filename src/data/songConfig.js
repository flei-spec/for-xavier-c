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
 * Resolve a raw song src path to a final, fully-encoded playback URL.
 *
 * src is expected to be a raw (un-encoded) path like "/songs/foo bar,baz.mp3".
 * Each path segment is individually percent-encoded so that Chinese characters,
 * spaces, commas, parentheses, and other special bytes all survive transport to
 * Cloudflare R2 or Vite's local static server.
 *
 * Examples (CDN_BASE = 'https://pub-abc.r2.dev')
 *   "/songs/30年前，50年后 - 精卫.mp3"
 *     → "https://pub-abc.r2.dev/songs/30%E5%B9%B4%E5%89%8D%EF%BC%8C50%E5%B9%B4%E5%90%8E%20-%20%E7%B2%BE%E5%8D%AB.mp3"
 *
 *   "/songs/Aaron Smith,Luvli,Krono - Dancin (Krono Remix).mp3"
 *     → "https://pub-abc.r2.dev/songs/Aaron%20Smith%2CLuvli%2CKrono%20-%20Dancin%20(Krono%20Remix).mp3"
 *
 * Voice intros (/Voice-intros/*.m4a) never pass through this function —
 * they are served directly from Vercel using their plain ASCII paths.
 */
export function resolveSongUrl(src) {
  // Encode each path segment individually; leave the "/" separators intact.
  // encodeURIComponent handles: spaces → %20, Chinese → %EF…, commas → %2C,
  // ampersands → %26, hashes → %23, non-breaking spaces → %C2%A0, etc.
  // Parentheses ( ) are intentionally left un-encoded (RFC 3986 safe chars).
  const encoded = src.split('/').map(encodeURIComponent).join('/')

  if (!CDN_BASE) {
    // Local dev: Vite decodes percent-encoded paths before looking up public/
    console.log('[Audio] local →', encoded)
    return encoded
  }

  const url = `${CDN_BASE.replace(/\/$/, '')}${encoded}`
  console.log('[Audio] CDN →', url)
  return url
}

// ─────────────────────────────────────────────────────────────────────────────
//  Voice intros (public/Voice-intros/*.m4a) are small and stay on Vercel.
//  Only the MP3 library in public/songs/ moves to R2.
// ─────────────────────────────────────────────────────────────────────────────
