/**
 * sanitizeFilename — convert any display name into a Safari-safe, kebab-case
 * ASCII filename stem (no extension).
 *
 * Rules applied in order:
 *  1. Strip CJK / full-width / CJK punctuation blocks (Chinese, Japanese, Korean).
 *  2. Remove parenthetical annotations — both ASCII (…) and full-width （…）.
 *  3. Map separators (commas, spaces, underscores, &, +, quotes, dots) → dash.
 *  4. Strip any remaining non-alphanumeric, non-dash character.
 *  5. Collapse runs of dashes; trim leading / trailing dashes.
 *  6. Lowercase everything.
 *
 * Returns an empty string when nothing ASCII-alphanumeric survives (caller
 * should then fall back to an index-based name like "track-0042").
 *
 * @param {string} text — raw display name, artist, or title
 * @returns {string}    — slug, e.g. "adele--easy-on-me"
 *
 * @example
 * sanitizeFilename('Adele - Easy On Me')          // 'adele--easy-on-me'
 * sanitizeFilename('24kGoldn,iann dior - Mood')   // '24kgoldn-iann-dior--mood'
 * sanitizeFilename('陈粒 - 小半')                 // ''  (caller uses fallback)
 * sanitizeFilename('Let Me Down Slowly (Acoustic)') // 'let-me-down-slowly'
 */
export function sanitizeFilename(text) {
  if (!text) return ''
  return text
    // 1. CJK Unified Ideographs + extensions + compatibility + radicals +
    //    CJK symbols & punctuation + half/full-width forms + enclosed CJK
    .replace(/[⺀-⻿⼀-⿟　-〿぀-ゟ゠-ヿ㄀-ㄯ㈀-㋿㐀-䶿一-鿿ꀀ-꒏豈-﫿ﬀ-﷿＀-￯]/g, '')
    // 2. Parenthetical annotations (full-width then ASCII to avoid nesting issues)
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    // 3. Separators → dash
    .replace(/[,，.。!！?？;；:：&+_'"'""\[\]【】\s]+/g, '-')
    // 4. Strip everything else that isn't a-z, 0-9, or -
    .replace(/[^a-z0-9-]/gi, '')
    // 5. Collapse runs of dashes; trim edges
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    // 6. Lowercase
    .toLowerCase()
}

/**
 * Build a complete kebab-case filename stem from a song's artist and title.
 * Falls back to "track-{NNNN}" when no ASCII content survives sanitization.
 *
 * @param {string} artist
 * @param {string} title
 * @param {number} index   — zero-based position in the playlist (for fallback)
 * @returns {string}       — stem without extension, e.g. "adele--easy-on-me"
 */
export function buildSongSlug(artist, title, index) {
  const a = sanitizeFilename(artist)
  const t = sanitizeFilename(title)

  let slug = ''
  if (a && t)  slug = `${a}--${t}`
  else if (t)  slug = t
  else if (a)  slug = a

  // Require at least 3 characters AND at least one letter to be meaningful.
  // Pure-number slugs like "3050" (from "30年前，50年后") fall back to positional.
  return slug.length >= 3 && /[a-z]/.test(slug)
    ? slug
    : `track-${String(index + 1).padStart(4, '0')}`
}
