import { supabase } from '../lib/supabase'

// Table: diary_entries
// Columns: id, title, content, mood, space_id (nullable), user_id, created_at

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end   = new Date(); end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

// Apply the right ownership filter:
//   - if spaceId: filter by space_id (shared space entries)
//   - else:       filter by user_id where space_id is null (personal entries)
function applyOwnerFilter(query, { spaceId, userId }) {
  if (spaceId) return query.eq('space_id', spaceId)
  return query.eq('user_id', userId).is('space_id', null)
}

// ── Queries ────────────────────────────────────────────────────────────────────

export async function todayEntry({ spaceId, userId }) {
  if (!spaceId && !userId) return null
  const { start, end } = todayRange()
  console.log('[journal] todayEntry — spaceId:', spaceId, 'userId:', userId)
  let q = supabase
    .from('diary_entries')
    .select('*')
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false })
    .limit(1)
  q = applyOwnerFilter(q, { spaceId, userId })
  const { data, error } = await q.maybeSingle()
  if (error) { console.error('[journal] todayEntry error:', error.message, error); return null }
  console.log('[journal] todayEntry result:', data?.id ?? 'none')
  return data
}

export async function randomOldEntry({ spaceId, userId }) {
  if (!spaceId && !userId) return null
  const { start } = todayRange()
  console.log('[journal] randomOldEntry — spaceId:', spaceId, 'userId:', userId)
  let q = supabase
    .from('diary_entries')
    .select('id, content, created_at')
    .lt('created_at', start)
  q = applyOwnerFilter(q, { spaceId, userId })
  const { data, error } = await q
  if (error) { console.error('[journal] randomOldEntry error:', error.message, error); return null }
  const rows = data ?? []
  const result = rows.length ? rows[Math.floor(Math.random() * rows.length)] : null
  console.log('[journal] randomOldEntry result:', result?.id ?? 'none', `(${rows.length} past entries)`)
  return result
}

export async function fetchAllEntries({ spaceId, userId }) {
  if (!spaceId && !userId) return []
  console.log('[journal] fetchAllEntries — spaceId:', spaceId, 'userId:', userId)
  let q = supabase
    .from('diary_entries')
    .select('id, title, content, mood, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  q = applyOwnerFilter(q, { spaceId, userId })
  const { data, error } = await q
  if (error) { console.error('[journal] fetchAllEntries error:', error.message, error); return [] }
  console.log('[journal] fetchAllEntries result:', data?.length ?? 0, 'entries')
  return data ?? []
}

export async function deleteEntry(id) {
  console.log('[journal] deleteEntry id:', id)
  const { error } = await supabase
    .from('diary_entries')
    .delete()
    .eq('id', id)
  if (error) { console.error('[journal] deleteEntry error:', error.message, error); return false }
  console.log('[journal] deleteEntry success')
  return true
}

// ── Write ──────────────────────────────────────────────────────────────────────

export async function saveTodayEntry({ text, moodLabel, song, spaceId, userId }) {
  console.log('[journal] saveTodayEntry — spaceId:', spaceId, 'userId:', userId)

  if (!userId) {
    console.error('[journal] saveTodayEntry: missing userId — aborting')
    return
  }

  const existing = await todayEntry({ spaceId: spaceId ?? null, userId })

  const payload = {
    content:  text,
    title:    song?.title ?? null,
    mood:     moodLabel   ?? null,
    user_id:  userId,
    ...(spaceId ? { space_id: spaceId } : { space_id: null }),
  }

  console.log('[journal] saveTodayEntry payload:', payload)

  if (existing) {
    console.log('[journal] updating existing entry:', existing.id)
    const { error } = await supabase
      .from('diary_entries')
      .update({ content: text, title: payload.title, mood: payload.mood })
      .eq('id', existing.id)
    if (error) console.error('[journal] update error:', error.message, error)
    else       console.log('[journal] update success')
  } else {
    console.log('[journal] inserting new entry...')
    const { data, error } = await supabase
      .from('diary_entries')
      .insert(payload)
      .select()
    if (error) console.error('[journal] insert error:', error.message, error)
    else       console.log('[journal] insert success, row:', data)
  }
}
