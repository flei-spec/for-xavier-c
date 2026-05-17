import { supabase } from '../lib/supabase'

// Table: diary_entries
// Columns: id, title, content, mood, space_id, user_id,
//          entry_type ('daily_note'|'secret_letter'), is_read, read_at, read_by,
//          created_at

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end   = new Date(); end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

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
    .or('entry_type.is.null,entry_type.eq.daily_note')
  q = applyOwnerFilter(q, { spaceId, userId })
  const { data, error } = await q
  if (error) { console.error('[journal] randomOldEntry error:', error.message, error); return null }
  const rows = data ?? []
  const result = rows.length ? rows[Math.floor(Math.random() * rows.length)] : null
  console.log('[journal] randomOldEntry result:', result?.id ?? 'none', `(${rows.length} past entries)`)
  return result
}

// Fetch records for display:
//  - all daily_note entries (and legacy entries without entry_type)
//  - secret_letter entries only if is_read = true
export async function fetchAllEntries({ spaceId, userId }) {
  if (!spaceId && !userId) return []
  const filterDesc = spaceId
    ? `space_id = ${spaceId}`
    : `user_id = ${userId} AND space_id IS NULL`
  console.log('[journal] fetchAllEntries — records query filter:', filterDesc)

  // Two queries: daily notes (always visible) + read secret letters
  let q1 = supabase
    .from('diary_entries')
    .select('id, title, content, mood, created_at, user_id, entry_type')
    .or('entry_type.is.null,entry_type.eq.daily_note')
    .order('created_at', { ascending: false })
    .limit(50)
  q1 = applyOwnerFilter(q1, { spaceId, userId })

  let q2 = supabase
    .from('diary_entries')
    .select('id, title, content, mood, created_at, user_id, entry_type')
    .eq('entry_type', 'secret_letter')
    .eq('is_read', true)
    .order('created_at', { ascending: false })
    .limit(50)
  q2 = applyOwnerFilter(q2, { spaceId, userId })

  const [{ data: d1, error: e1 }, { data: d2, error: e2 }] = await Promise.all([q1, q2])
  if (e1) console.error('[journal] fetchAllEntries (daily) error:', e1.message, e1)
  if (e2) console.error('[journal] fetchAllEntries (secret) error:', e2.message, e2)

  const all = [...(d1 ?? []), ...(d2 ?? [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 50)

  console.log('[journal] fetched records:', all.length, 'entries')
  return all
}

// Get the most recent unread secret letter from a PARTNER (not current user).
export async function fetchUnreadSecretLetters({ spaceId, userId }) {
  if (!spaceId && !userId) return []
  console.log('[journal] fetchUnreadSecretLetters — spaceId:', spaceId, 'userId:', userId)
  let q = supabase
    .from('diary_entries')
    .select('id, content, created_at, user_id')
    .eq('entry_type', 'secret_letter')
    .eq('is_read', false)
    .neq('user_id', userId)   // partner's letters only, not mine
    .order('created_at', { ascending: false })
    .limit(5)

  if (spaceId) q = q.eq('space_id', spaceId)
  else q = q.eq('user_id', userId).is('space_id', null)  // fallback: won't return any (partner letters need space)

  const { data, error } = await q
  if (error) { console.error('[journal] fetchUnreadSecretLetters error:', error.message, error); return [] }
  console.log('[journal] unread secret letters:', data?.length ?? 0)
  return data ?? []
}

// Lightweight count-only query — never loads letter content.
// Used for the subtle unread indicator on the HeartUnlock menu.
export async function fetchUnreadLetterCount({ spaceId, userId }) {
  if (!spaceId || !userId) return 0
  const { count, error } = await supabase
    .from('diary_entries')
    .select('*', { count: 'exact', head: true })
    .eq('entry_type', 'secret_letter')
    .eq('is_read', false)
    .neq('user_id', userId)
    .eq('space_id', spaceId)
  if (error) { console.error('[journal] fetchUnreadLetterCount error:', error.message, error); return 0 }
  return count ?? 0
}

// Mark a secret letter as read.
export async function markLetterAsRead(entryId, userId) {
  console.log('[journal] markLetterAsRead — id:', entryId, 'by user:', userId)
  const { error } = await supabase
    .from('diary_entries')
    .update({ is_read: true, read_at: new Date().toISOString(), read_by: userId })
    .eq('id', entryId)
  if (error) console.error('[journal] markLetterAsRead error:', error.message, error)
  else       console.log('[journal] markLetterAsRead success')
}

export async function deleteEntry(id) {
  console.log('[journal] deleteEntry — id:', id)
  const { data, error } = await supabase
    .from('diary_entries')
    .delete()
    .eq('id', id)
    .select()  // returns the deleted rows so we can confirm deletion happened

  if (error) {
    console.error('[journal] deleteEntry error:', error.message, error)
    return false
  }

  if (!data || data.length === 0) {
    // RLS silently blocked the delete — no error, but nothing was removed
    console.error('[journal] deleteEntry: 0 rows deleted — RLS may be blocking. Check diary_entries delete policies.')
    return false
  }

  console.log('[journal] deleteEntry success — deleted row:', data[0]?.id)
  return true
}

// ── Write ──────────────────────────────────────────────────────────────────────

// Create a new entry (daily note by default, secret letter when specified).
export async function saveNewEntry({ text, moodLabel, song, spaceId, userId, entryType = 'daily_note' }) {
  console.log('[journal] saveNewEntry — currentSpace.id:', spaceId ?? 'none (personal)', '| userId:', userId, '| type:', entryType)

  if (!userId) {
    console.error('[journal] saveNewEntry: missing userId — aborting')
    return false
  }

  const payload = {
    content:    text,
    title:      song?.title ?? null,
    mood:       moodLabel   ?? null,
    user_id:    userId,
    entry_type: entryType,
    ...(spaceId ? { space_id: spaceId } : { space_id: null }),
  }

  console.log('[journal] saveNewEntry insert payload:', payload)

  const { data, error } = await supabase
    .from('diary_entries')
    .insert(payload)
    .select()

  if (error) { console.error('[journal] saveNewEntry error:', error.message, error); return false }
  console.log('[journal] saveNewEntry success, row:', data)
  return true
}

// Convenience: save a secret letter.
export async function saveSecretLetter({ text, spaceId, userId }) {
  return saveNewEntry({ text, spaceId, userId, entryType: 'secret_letter' })
}

// Legacy — kept for compatibility.
export async function saveTodayEntry({ text, moodLabel, song, spaceId, userId }) {
  return saveNewEntry({ text, moodLabel, song, spaceId, userId, entryType: 'daily_note' })
}
