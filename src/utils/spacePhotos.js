import { supabase } from '../lib/supabase'

// ── Image compression ─────────────────────────────────────────────────────────
// Resizes to maxWidth and re-encodes as JPEG before upload.
// Keeps file sizes reasonable (~200–500KB) regardless of original.

export function compressImage(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('not an image'))
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale   = Math.min(1, maxWidth / img.width)
      const canvas  = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx     = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('compression failed')),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')) }
    img.src = url
  })
}

// ── Upload ────────────────────────────────────────────────────────────────────
// Path: {spaceId}/{userId}/{uuid}.jpg  — UUID prevents collisions and guessing.

export async function uploadPhoto({ file, spaceId, userId, caption }) {
  let blob
  try { blob = await compressImage(file) }
  catch (err) {
    console.error('[spacePhotos] compress error:', err.message)
    return { error: '图片处理失败，请重试' }
  }

  const path = `${spaceId}/${userId}/${crypto.randomUUID()}.jpg`

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('space-photos')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })

  if (uploadErr) {
    console.error('[spacePhotos] upload error:', uploadErr.message)
    return { error: '上传失败，请重试' }
  }

  const { data: urlData } = supabase.storage
    .from('space-photos')
    .getPublicUrl(uploadData.path)

  const photoUrl = urlData?.publicUrl
  if (!photoUrl) return { error: '获取图片地址失败' }

  const { error: insertErr } = await supabase
    .from('space_photos')
    .insert({
      space_id:     spaceId,
      user_id:      userId,
      storage_path: uploadData.path,
      photo_url:    photoUrl,
      caption:      caption?.trim() || null,
    })

  if (insertErr) {
    console.error('[spacePhotos] insert error:', insertErr.message)
    return { error: '保存失败，请重试' }
  }

  return { error: null }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchSpacePhotos(spaceId) {
  const { data, error } = await supabase
    .from('space_photos')
    .select('id, user_id, photo_url, storage_path, caption, created_at')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[spacePhotos] fetch error:', error.message)
    return []
  }
  return data ?? []
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deletePhoto(id, storagePath) {
  // Remove file from storage first (best-effort — proceed even on error)
  const { error: storageErr } = await supabase.storage
    .from('space-photos')
    .remove([storagePath])

  if (storageErr) console.error('[spacePhotos] storage delete error:', storageErr.message)

  const { error: dbErr } = await supabase
    .from('space_photos')
    .delete()
    .eq('id', id)

  if (dbErr) {
    console.error('[spacePhotos] db delete error:', dbErr.message)
    return false
  }
  return true
}
