import { supabase } from './supabase'

// Returns a map of { userId: displayName } for all given user IDs.
export async function getProfiles(userIds) {
  const unique = [...new Set((userIds ?? []).filter(Boolean))]
  if (unique.length === 0) return {}

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', unique)

  if (error) {
    console.error('[profiles] getProfiles error:', error.message, error)
    return {}
  }

  return Object.fromEntries(
    (data ?? []).map(p => [p.user_id, p.display_name || '有人'])
  )
}

// Upsert the current user's profile (email prefix as default display name).
export async function ensureProfile(userId, email) {
  if (!userId) return
  await supabase
    .from('profiles')
    .upsert({ user_id: userId, display_name: email?.split('@')[0] || '有人' },
             { onConflict: 'user_id', ignoreDuplicates: true })
}
