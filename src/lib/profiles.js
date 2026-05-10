import { supabase } from './supabase'

// Returns a map of { userId: displayName } for all given user IDs.
export async function getProfiles(userIds) {
  const unique = [...new Set((userIds ?? []).filter(Boolean))]
  if (unique.length === 0) return {}

  console.log('[profiles] getProfiles — fetching for', unique.length, 'users')
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', unique)

  if (error) {
    console.error('[profiles] getProfiles error:', error.message, error)
    return {}
  }

  console.log('[profiles] getProfiles result:', data)
  return Object.fromEntries(
    (data ?? []).map(p => [p.user_id, p.display_name || '有人'])
  )
}

// Create profile if it doesn't exist (security definer RPC bypasses RLS).
// Uses "on conflict do nothing" so custom nicknames are never overwritten.
export async function ensureProfile(userId, email) {
  if (!userId || !email) return
  console.log('[profiles] ensureProfile — userId:', userId, 'email:', email)
  const { error } = await supabase.rpc('ensure_profile', {
    p_user_id: userId,
    p_email:   email,
  })
  if (error) console.error('[profiles] ensureProfile error:', error.message, error)
}

// Update the current user's display name.
export async function updateDisplayName(userId, name) {
  console.log('[profiles] updateDisplayName — userId:', userId, 'name:', name)
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) {
    console.error('[profiles] updateDisplayName error:', error.message, error)
    return false
  }
  console.log('[profiles] updateDisplayName success')
  return true
}
