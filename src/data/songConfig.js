// ─────────────────────────────────────────────────────────────────────────────
//  Song source configuration
//
//  LOCAL (current):  all MP3s live in public/songs/
//  FUTURE (CDN):     set CDN_BASE to your Cloudflare R2 / CDN public URL
// ─────────────────────────────────────────────────────────────────────────────

// Set CDN_BASE when you're ready to serve songs from Cloudflare R2 or any CDN.
// Example: 'https://music.yoursite.com'  or  'https://pub-abc123.r2.dev'
// Leave empty ('') to serve songs from local /songs/ (Vite public directory).
export const CDN_BASE = ''

/**
 * Resolve a song's src path to the final playback URL.
 *
 * Local  → /songs/foo.mp3
 * CDN    → https://cdn.yoursite.com/songs/foo.mp3
 */
export function resolveSongUrl(src) {
  if (!CDN_BASE) return src
  return `${CDN_BASE.replace(/\/$/, '')}/${src.replace(/^\//, '')}`
}

// ─── Cloudflare R2 Integration Guide (future) ─────────────────────────────────
//
//  Step 1: Create a Cloudflare R2 bucket and enable public access
//          (or attach a custom domain via Cloudflare DNS).
//
//  Step 2: Upload your full MP3 library to the bucket:
//            rclone copy public/songs/ r2:your-bucket/songs/ --progress
//
//  Step 3: Set CDN_BASE here, for example:
//            export const CDN_BASE = 'https://music.yoursite.com'
//
//  Step 4: Add public/songs/ to .gitignore so large files leave the repo:
//            echo "public/songs/" >> .gitignore
//            git rm -r --cached public/songs/
//
//  Step 5: Redeploy — songs now stream from Cloudflare's global edge network,
//          with zero origin bandwidth and automatic caching.
//
// ─────────────────────────────────────────────────────────────────────────────
