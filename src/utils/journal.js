// ─────────────────────────────────────────────────────────────────────────────
//  journal.js — local memory journal, stored in localStorage only.
//  No account, no backend, no network calls.
//
//  Entry shape:
//  {
//    id:         string   — Date.now() as string, unique
//    text:       string   — the user's written text
//    date:       string   — ISO timestamp of when it was saved
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

export function saveEntry({ text, moodId, moodLabel, moodIcon, song }) {
  const entry = {
    id:        String(Date.now()),
    text:      text.trim(),
    date:      new Date().toISOString(),
    moodId:    moodId   ?? null,
    moodLabel: moodLabel ?? null,
    moodIcon:  moodIcon  ?? null,
    song:      song ?? null,
  }

  try {
    const all = loadEntries()
    all.unshift(entry)   // newest first
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // localStorage full or unavailable — silently skip persistence
  }

  return entry
}

// ── Queries ───────────────────────────────────────────────────────────────────

// The entry written today, or null.
export function todayEntry() {
  const today = new Date().toDateString()
  return loadEntries().find(e => new Date(e.date).toDateString() === today) ?? null
}

// A random entry from a previous day (not today), or null.
export function randomOldEntry() {
  const today = new Date().toDateString()
  const old   = loadEntries().filter(e => new Date(e.date).toDateString() !== today)
  return old.length ? old[Math.floor(Math.random() * old.length)] : null
}
