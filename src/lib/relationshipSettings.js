import { supabase } from './supabase'

// ── Load ──────────────────────────────────────────────────────────────────────

export async function loadStoryStartDate({ userId, spaceId }) {
  console.log('[relationship] loadStoryStartDate — user_id:', userId, 'space_id:', spaceId)

  if (spaceId) {
    const { data, error } = await supabase
      .from('relationship_settings')
      .select('story_start_date')
      .eq('space_id', spaceId)
      .maybeSingle()
    if (error) { console.error('[relationship] load by space error:', error.message, error); return null }
    console.log('[relationship] loaded by space:', data?.story_start_date ?? 'none')
    return data?.story_start_date ?? null
  }

  if (userId) {
    const { data, error } = await supabase
      .from('relationship_settings')
      .select('story_start_date')
      .eq('user_id', userId)
      .is('space_id', null)
      .maybeSingle()
    if (error) { console.error('[relationship] load by user error:', error.message, error); return null }
    console.log('[relationship] loaded by user:', data?.story_start_date ?? 'none')
    return data?.story_start_date ?? null
  }

  return null
}

// ── Save ──────────────────────────────────────────────────────────────────────

export async function saveStoryStartDate({ userId, spaceId, date }) {
  console.log('[relationship] saveStoryStartDate — user_id:', userId, 'space_id:', spaceId, 'date:', date)

  const now = new Date().toISOString()

  if (spaceId) {
    const { data: existing, error: findErr } = await supabase
      .from('relationship_settings')
      .select('id')
      .eq('space_id', spaceId)
      .maybeSingle()
    if (findErr) { console.error('[relationship] find error:', findErr.message, findErr); return false }

    if (existing) {
      const { error } = await supabase
        .from('relationship_settings')
        .update({ story_start_date: date, updated_at: now })
        .eq('id', existing.id)
      if (error) { console.error('[relationship] update error:', error.message, error); return false }
    } else {
      const { error } = await supabase
        .from('relationship_settings')
        .insert({ space_id: spaceId, user_id: userId, story_start_date: date })
      if (error) { console.error('[relationship] insert error:', error.message, error); return false }
    }
    console.log('[relationship] saved by space')
    return true
  }

  if (userId) {
    const { data: existing, error: findErr } = await supabase
      .from('relationship_settings')
      .select('id')
      .eq('user_id', userId)
      .is('space_id', null)
      .maybeSingle()
    if (findErr) { console.error('[relationship] find error:', findErr.message, findErr); return false }

    if (existing) {
      const { error } = await supabase
        .from('relationship_settings')
        .update({ story_start_date: date, updated_at: now })
        .eq('id', existing.id)
      if (error) { console.error('[relationship] update error:', error.message, error); return false }
    } else {
      const { error } = await supabase
        .from('relationship_settings')
        .insert({ user_id: userId, story_start_date: date })
      if (error) { console.error('[relationship] insert error:', error.message, error); return false }
    }
    console.log('[relationship] saved by user')
    return true
  }

  return false
}
