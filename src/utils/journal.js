import { supabase } from '../lib/supabase'

// Table: diary_entries
// Columns: id (uuid, auto), title (text), content (text), mood (text), created_at (timestamptz, auto)

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end   = new Date(); end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

// ── Queries ────────────────────────────────────────────────────────────────────

export async function todayEntry() {
  const { start, end } = todayRange()
  console.log('[journal] todayEntry: querying diary_entries for today')
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) { console.error('[journal] todayEntry error:', error.message); return null }
  console.log('[journal] todayEntry result:', data)
  return data
}

export async function randomOldEntry() {
  const { start } = todayRange()
  const { data, error } = await supabase
    .from('diary_entries')
    .select('id, content, created_at')
    .lt('created_at', start)
  if (error) { console.error('[journal] randomOldEntry error:', error.message); return null }
  const rows = data ?? []
  return rows.length ? rows[Math.floor(Math.random() * rows.length)] : null
}

// ── Write ──────────────────────────────────────────────────────────────────────

export async function saveTodayEntry({ text, moodLabel, song }) {
  console.log('[journal] saveTodayEntry called with:', { text, moodLabel, song })

  const existing = await todayEntry()

  const payload = {
    content: text,
    title:   song?.title  ?? null,
    mood:    moodLabel    ?? null,
  }

  console.log('[journal] payload to send:', payload)

  if (existing) {
    console.log('[journal] updating existing entry id:', existing.id)
    const { error } = await supabase
      .from('diary_entries')
      .update(payload)
      .eq('id', existing.id)
    if (error) {
      console.error('[journal] update error:', error.message, error)
    } else {
      console.log('[journal] update success')
    }
  } else {
    console.log('[journal] inserting new entry')
    const { data, error } = await supabase
      .from('diary_entries')
      .insert(payload)
      .select()
    if (error) {
      console.error('[journal] insert error:', error.message, error)
    } else {
      console.log('[journal] insert success, row:', data)
    }
  }
}
