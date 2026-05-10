import { supabase } from './supabase'

// Unambiguous characters: no O/0, I/1/L, S/5
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateCode() {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

// ── Read ───────────────────────────────────────────────────────────────────────

export async function getMySpace(userId) {
  console.log('[spaces] get_my_space — userId:', userId)

  // Debug: show ALL memberships for this user so we can see duplicates
  const { data: memberships } = await supabase
    .from('space_members')
    .select('space_id, joined_at')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
  console.log('[spaces] all memberships for user:', memberships)

  const { data, error } = await supabase.rpc('get_my_space')

  if (error) {
    console.error('[spaces] get_my_space RPC error:', error.message, error)
    return null
  }

  console.log('[spaces] get_my_space result:', data)
  console.log('[spaces] selected currentSpace:', data?.space?.id ?? 'none', '| member_count:', data?.member_count ?? 0)
  return data?.space ?? null
}

// ── Write ──────────────────────────────────────────────────────────────────────

export async function createSpace() {
  const { data: { session } } = await supabase.auth.getSession()
  console.log('[spaces] createSpace — session:', session)

  if (!session) {
    console.error('[spaces] createSpace — no session, aborting')
    return { space: null, error: '请先重新登录' }
  }

  console.log('[spaces] createSpace — calling rpc create_space')
  const { data, error } = await supabase.rpc('create_space')

  console.log('[spaces] createSpace — rpc result:', data)

  if (error) {
    console.error('[spaces] createSpace — rpc error:', error.message, error)
    return { space: null, error: error.message }
  }

  if (data?.error) {
    console.error('[spaces] createSpace — function error:', data.error)
    return { space: null, error: data.error }
  }

  console.log('[spaces] createSpace — success, space:', data.space, 'invite_code:', data.invite_code)
  return { space: data.space, error: null }
}

export async function leaveSpace(spaceId) {
  console.log('[spaces] leaveSpace — space_id:', spaceId)
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    console.error('[spaces] leaveSpace — not authenticated')
    return { error: '未登录' }
  }
  console.log('[spaces] leaveSpace — user_id:', user.id)
  const { error } = await supabase
    .from('space_members')
    .delete()
    .eq('space_id', spaceId)
    .eq('user_id', user.id)
  if (error) {
    console.error('[spaces] leaveSpace error:', error.message, error)
    return { error: error.message }
  }
  console.log('[spaces] leaveSpace — success')
  return { error: null }
}

// Uses a security-definer RPC so a non-member can look up a space by invite code.
export async function joinSpace(inviteCode) {
  // Strip every whitespace character (including internal spaces from copy-paste),
  // then uppercase. This handles inputs like "AB 3K 7M" or "ab3k7m".
  const normalizedCode = inviteCode.replace(/\s+/g, '').toUpperCase()

  console.log('[spaces] joinSpace — raw input:', JSON.stringify(inviteCode))
  console.log('[spaces] joinSpace — normalized code:', normalizedCode)

  const { data, error } = await supabase.rpc('join_space', {
    p_invite_code: normalizedCode,
  })

  console.log('[spaces] joinSpace — rpc response data:', data)
  if (error) {
    console.error('[spaces] joinSpace — rpc error:', error.message, error)
    return { space: null, error: error.message }
  }

  if (data?.error) {
    console.error('[spaces] joinSpace — function rejected:', data.error)
    return { space: null, error: data.error }
  }

  const space = data?.space ?? null
  const memberCount = data?.member_count ?? null
  console.log('[spaces] joinSpace — success, space id:', space?.id ?? 'none', '| member_count:', memberCount)
  return { space, error: null }
}
