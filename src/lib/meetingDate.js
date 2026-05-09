import { supabase } from './supabase'

export async function loadMeetingDate({ userId, spaceId }) {
  console.log('[meetingDate] loading — user_id:', userId, 'space_id:', spaceId)

  if (spaceId) {
    const { data, error } = await supabase
      .from('meeting_dates')
      .select('meeting_date')
      .eq('space_id', spaceId)
      .maybeSingle()
    if (error) { console.error('[meetingDate] load by space error:', error.message, error); return null }
    console.log('[meetingDate] loaded by space:', data?.meeting_date ?? 'none')
    return data?.meeting_date ?? null
  }

  if (userId) {
    const { data, error } = await supabase
      .from('meeting_dates')
      .select('meeting_date')
      .eq('user_id', userId)
      .is('space_id', null)
      .maybeSingle()
    if (error) { console.error('[meetingDate] load by user error:', error.message, error); return null }
    console.log('[meetingDate] loaded by user:', data?.meeting_date ?? 'none')
    return data?.meeting_date ?? null
  }

  return null
}

export async function saveMeetingDate({ userId, spaceId, date }) {
  console.log('[meetingDate] saving — user_id:', userId, 'space_id:', spaceId, 'date:', date)

  const now = new Date().toISOString()

  if (spaceId) {
    const { data: existing, error: findErr } = await supabase
      .from('meeting_dates')
      .select('id')
      .eq('space_id', spaceId)
      .maybeSingle()
    if (findErr) { console.error('[meetingDate] find error:', findErr.message, findErr); return false }

    if (existing) {
      const { error } = await supabase
        .from('meeting_dates')
        .update({ meeting_date: date, updated_at: now })
        .eq('id', existing.id)
      if (error) { console.error('[meetingDate] update error:', error.message, error); return false }
    } else {
      const { error } = await supabase
        .from('meeting_dates')
        .insert({ space_id: spaceId, user_id: userId, meeting_date: date })
      if (error) { console.error('[meetingDate] insert error:', error.message, error); return false }
    }
    console.log('[meetingDate] saved by space')
    return true
  }

  if (userId) {
    const { data: existing, error: findErr } = await supabase
      .from('meeting_dates')
      .select('id')
      .eq('user_id', userId)
      .is('space_id', null)
      .maybeSingle()
    if (findErr) { console.error('[meetingDate] find error:', findErr.message, findErr); return false }

    if (existing) {
      const { error } = await supabase
        .from('meeting_dates')
        .update({ meeting_date: date, updated_at: now })
        .eq('id', existing.id)
      if (error) { console.error('[meetingDate] update error:', error.message, error); return false }
    } else {
      const { error } = await supabase
        .from('meeting_dates')
        .insert({ user_id: userId, meeting_date: date })
      if (error) { console.error('[meetingDate] insert error:', error.message, error); return false }
    }
    console.log('[meetingDate] saved by user')
    return true
  }

  return false
}
