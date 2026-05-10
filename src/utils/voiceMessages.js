import { supabase } from '../lib/supabase'

// ── Helpers ────────────────────────────────────────────────────────────────────

// Pick the best supported audio MIME type for the current browser.
export function getSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ]
  return types.find(t => MediaRecorder.isTypeSupported?.(t)) ?? ''
}

export function mimeToExt(mimeType) {
  if (mimeType.includes('mp4'))  return '.mp4'
  if (mimeType.includes('ogg'))  return '.ogg'
  return '.webm'
}

// ── Storage ───────────────────────────────────────────────────────────────────

export async function uploadVoiceMessage({ blob, mimeType, spaceId, userId, durationMs }) {
  const ext      = mimeToExt(mimeType)
  const folder   = userId
  const filePath = `${folder}/${Date.now()}${ext}`

  console.log('[voice] uploading — path:', filePath, '| size:', blob.size, '| space:', spaceId ?? 'none')

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('voice-messages')
    .upload(filePath, blob, { contentType: mimeType, upsert: false })

  if (uploadErr) {
    console.error('[voice] upload error:', uploadErr.message, uploadErr)
    return { error: uploadErr.message }
  }

  console.log('[voice] upload success — path:', uploadData.path)

  const { error: insertErr } = await supabase
    .from('voice_messages')
    .insert({
      storage_path: uploadData.path,
      user_id:      userId,
      duration_ms:  durationMs ?? null,
      ...(spaceId ? { space_id: spaceId } : { space_id: null }),
    })

  if (insertErr) {
    console.error('[voice] insert metadata error:', insertErr.message, insertErr)
    return { error: insertErr.message }
  }

  console.log('[voice] metadata saved')
  return { error: null }
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function fetchVoiceMessages({ spaceId, userId }) {
  if (!spaceId && !userId) return []
  console.log('[voice] fetchVoiceMessages — spaceId:', spaceId ?? 'none', '| userId:', userId)

  let q = supabase
    .from('voice_messages')
    .select('id, storage_path, duration_ms, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(30)

  if (spaceId) q = q.eq('space_id', spaceId)
  else         q = q.eq('user_id', userId).is('space_id', null)

  const { data, error } = await q
  if (error) { console.error('[voice] fetchVoiceMessages error:', error.message, error); return [] }
  console.log('[voice] fetched', data?.length ?? 0, 'voice messages')
  return data ?? []
}

// Returns a 1-hour signed URL for playback.
export async function getSignedUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from('voice-messages')
    .createSignedUrl(storagePath, 3600)
  if (error) { console.error('[voice] getSignedUrl error:', error.message); return null }
  return data.signedUrl
}

// ── Delete ─────────────────────────────────────────────────────────────────────

export async function deleteVoiceMessage(id, storagePath) {
  console.log('[voice] deleteVoiceMessage — id:', id, '| path:', storagePath)

  const { data, error: dbErr } = await supabase
    .from('voice_messages')
    .delete()
    .eq('id', id)
    .select()

  if (dbErr) { console.error('[voice] delete metadata error:', dbErr.message, dbErr); return false }
  if (!data || data.length === 0) { console.error('[voice] delete: 0 rows deleted — RLS may be blocking'); return false }

  const { error: storErr } = await supabase.storage
    .from('voice-messages')
    .remove([storagePath])
  if (storErr) console.error('[voice] delete storage error (non-fatal):', storErr.message)

  console.log('[voice] deleteVoiceMessage success')
  return true
}
