import { supabase } from '../lib/supabase'

// Table: mood_history
// Columns: id, user_id, space_id, source, original_input, matched_mood,
//          emotional_line, current_track_id, current_track_title, created_at

// ── Dev debugging ──────────────────────────────────────────────────────────────

if (import.meta.env.DEV) {
  window.supabaseDebug = supabase
  window.logMoodEventDebug = logMoodEventInternal
}

// ── Write ──────────────────────────────────────────────────────────────────────

export async function logMoodEvent(params) {
  return logMoodEventInternal(params)
}

async function logMoodEventInternal({
  userId,
  spaceId,
  source,
  originalInput = null,
  matchedMood,
  emotionalLine = null,
  currentTrackId = null,
  currentTrackTitle = null,
}) {
  if (!userId || !matchedMood || !source) {
    console.warn('[MoodHistory] skipping — missing required fields', { userId, matchedMood, source })
    return false
  }

  const payload = {
    user_id:            userId,
    space_id:           spaceId ?? null,
    source,
    original_input:     originalInput,
    matched_mood:       matchedMood,
    emotional_line:     emotionalLine,
    current_track_id:   currentTrackId,
    current_track_title: currentTrackTitle,
  }

  console.log('[MoodHistory] inserting', payload)

  const { data, error } = await supabase.from('mood_history').insert(payload).select()

  if (error) {
    console.error('[MoodHistory] failed', error.message, error)
    return false
  }

  console.log('[MoodHistory] success', data)
  return true
}

// ── Read ───────────────────────────────────────────────────────────────────────

export async function getLatestMood(userId) {
  if (!userId) return null

  const { data, error } = await supabase
    .from('mood_history')
    .select('matched_mood, created_at, source, emotional_line')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[moodHistory] getLatestMood error:', error.message, error)
    return null
  }

  return data
}

export async function getWeeklyStats(userId) {
  if (!userId) return null

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('mood_history')
    .select('matched_mood, created_at')
    .eq('user_id', userId)
    .gte('created_at', weekAgo.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[moodHistory] getWeeklyStats error:', error.message, error)
    return null
  }

  if (!data || data.length === 0) return { topMoods: [], totalEntries: 0, mostRecentMood: null }

  // Aggregate by mood
  const counts = {}
  for (const row of data) {
    counts[row.matched_mood] = (counts[row.matched_mood] || 0) + 1
  }

  const topMoods = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([mood, count]) => ({ mood, count }))

  return {
    topMoods,
    totalEntries: data.length,
    mostRecentMood: data[0].matched_mood,
  }
}
