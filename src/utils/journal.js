// ─────────────────────────────────────────────────────────────────────────────
//  journal.js — local memory journal, localStorage only.
//  No account, no backend, no network calls.
//
//  Entry shape:
//  {
//    id:         string   — Date.now() as string (creation, never changes)
//    text:       string   — the user's written text
//    date:       string   — ISO timestamp of original creation
//    updatedAt:  string   — ISO timestamp of last save (may equal date)
//    moodId:     string | null
//    moodLabel:  string | null
//    moodIcon:   string | null
//    song:       { title: string, artist: string } | null
//  }
// ─────────────────────────────────────────────────────────────────────────────

const KEY = 'xavier_journal'

// ── Read ──────────────────────────────────────────────────────────────────────

export function loadEntries() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

// Create or update the entry for today.
// If one already exists for today, it is updated in-place (preserving original id + date).
// If none exists, a new entry is prepended (newest first).
export function saveTodayEntry({ text, moodId, moodLabel, moodIcon, song }) {
  const all   = loadEntries()
  const today = new Date().toDateString()
  const idx   = all.findIndex(e => new Date(e.date).toDateString() === today)

  const entry = {
    id:        idx >= 0 ? all[idx].id   : String(Date.now()),
    text:      text.trim(),
    date:      idx >= 0 ? all[idx].date : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    moodId:    moodId    ?? null,
    moodLabel: moodLabel ?? null,
    moodIcon:  moodIcon  ?? null,
    song:      song ?? null,
  }

  if (idx >= 0) {
    all[idx] = entry
  } else {
    all.unshift(entry)
  }

  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch {}
  return entry
}

// ── Queries ───────────────────────────────────────────────────────────────────

// The entry written today, or null.
export function todayEntry() {
  const today = new Date().toDateString()
  return loadEntries().find(e => new Date(e.date).toDateString() === today) ?? null
}

// A random entry from a previous day (not today), or null.
// Call this once and store in useState — do not call in a loop or on every render.
export function randomOldEntry() {
  const today = new Date().toDateString()
  const old   = loadEntries().filter(e => new Date(e.date).toDateString() !== today)
  return old.length ? old[Math.floor(Math.random() * old.length)] : null
}
