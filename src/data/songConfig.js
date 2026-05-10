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
 * Resolve a song src path ("/songs/adele--easy-on-me.mp3") to a playback URL.
 *
 * All song filenames are now pure ASCII kebab-case (run scripts/rename-songs.js
 * to convert any future files).  No encoding is required; the function simply
 * prepends CDN_BASE when set, or returns the local path for dev.
 *
 * Voice intros (/Voice-intros/*.m4a) never pass through this function.
 */
export function resolveSongUrl(src) {
  if (!CDN_BASE) return src
  return `${CDN_BASE.replace(/\/$/, '')}${src}`
}

// ─────────────────────────────────────────────────────────────────────────────
//  Voice intros (public/Voice-intros/*.m4a) are small and stay on Vercel.
//  Only the MP3 library in public/songs/ moves to R2.
// ─────────────────────────────────────────────────────────────────────────────
