import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getProfiles } from '../lib/profiles'
import { uploadPhoto, fetchSpacePhotos, deletePhoto } from '../utils/spacePhotos'
import './PhotoAlbum.css'

const MAX_CAPTION = 80
const MAX_FILE_MB = 15

function formatPhotoDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', {
    month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function groupByMonth(photos) {
  const groups = new Map()
  for (const p of photos) {
    const d   = new Date(p.created_at)
    const key = `${d.getFullYear()}年${d.getMonth() + 1}月`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(p)
  }
  return [...groups.entries()]
}

export default function PhotoAlbum({ onClose, onCloseAll }) {
  const { user, space } = useAuth()

  const [visible,   setVisible]   = useState(false)
  const [photos,    setPhotos]    = useState([])
  const [profiles,  setProfiles]  = useState({})
  const [loading,   setLoading]   = useState(true)
  const [pending,   setPending]   = useState(null)   // { file, previewUrl, caption }
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [lightbox,  setLightbox]  = useState(null)   // photo_url string
  const [confirmId, setConfirmId] = useState(null)
  const [deleting,  setDeleting]  = useState(null)
  const [deleteErr, setDeleteErr] = useState('')

  const fileInputRef = useRef(null)

  // ── Fade in ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  // ── Escape key ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (lightbox) { setLightbox(null); return }
        if (pending)  { clearPending(); return }
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, pending]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load photos ────────────────────────────────────────────────────────────
  const loadPhotos = useCallback(async () => {
    if (!space) return
    const rows = await fetchSpacePhotos(space.id)
    setPhotos(rows)
    setLoading(false)
    const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
    if (ids.length > 0) {
      const map = await getProfiles(ids)
      setProfiles(map)
    }
  }, [space?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadPhotos() }, [loadPhotos])

  // ── Revoke preview URL on cleanup ─────────────────────────────────────────
  const clearPending = useCallback(() => {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl)
    setPending(null)
    setUploadErr('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [pending])

  useEffect(() => () => { if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl) }, [])

  // ── File select ────────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setUploadErr('请选择图片文件'); return }
    if (file.size > MAX_FILE_MB * 1024 * 1024) { setUploadErr(`图片不能超过 ${MAX_FILE_MB}MB`); return }
    const previewUrl = URL.createObjectURL(file)
    setUploadErr('')
    setPending({ file, previewUrl, caption: '' })
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!pending || uploading || !user || !space) return
    setUploading(true)
    setUploadErr('')
    const { error } = await uploadPhoto({
      file:    pending.file,
      spaceId: space.id,
      userId:  user.id,
      caption: pending.caption,
    })
    setUploading(false)
    if (error) { setUploadErr(error); return }
    clearPending()
    await loadPhotos()
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    const photo = photos.find(p => p.id === confirmId)
    if (!photo) return
    setConfirmId(null)
    setDeleting(photo.id)
    const ok = await deletePhoto(photo.id, photo.storage_path)
    setDeleting(null)
    if (ok) {
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
    } else {
      setDeleteErr('删除失败，请重试')
      setTimeout(() => setDeleteErr(''), 3000)
    }
  }

  const close    = () => { setVisible(false); setTimeout(onClose, 380) }
  const closeAll = () => { setVisible(false); setTimeout(onCloseAll ?? onClose, 380) }

  const groups = groupByMonth(photos)

  return (
    <>
      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="pa__lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} className="pa__lightbox-img" alt="" />
          <button className="pa__lightbox-close" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}

      <div
        className={`pa__overlay ${visible ? 'pa__overlay--in' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) close() }}
      >
        <div className="pa__modal">
          <button className="pa__back"  onClick={close}>← 返回</button>
          <button className="pa__close" onClick={closeAll} aria-label="关闭">✕</button>

          <div className="pa__header">
            <span className="pa__icon">📷</span>
            <p className="pa__title">我们的相册</p>
          </div>

          {/* ── Upload area ── */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {pending ? (
            <div className="pa__pending">
              <div className="pa__preview-wrap">
                <img src={pending.previewUrl} className="pa__preview-img" alt="preview" />
              </div>
              <textarea
                className="pa__caption-input"
                placeholder="加一句话（可以不写）"
                value={pending.caption}
                maxLength={MAX_CAPTION}
                rows={2}
                onChange={e => setPending(p => ({ ...p, caption: e.target.value }))}
              />
              <div className="pa__pending-footer">
                <span className="pa__caption-count">{pending.caption.length}/{MAX_CAPTION}</span>
                {uploadErr && <span className="pa__upload-err">{uploadErr}</span>}
              </div>
              <div className="pa__pending-btns">
                <button
                  className="pa__upload-btn"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? '上传中…' : '保存这张'}
                </button>
                <button className="pa__cancel-btn" onClick={clearPending} disabled={uploading}>
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              className="pa__add-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              + 上传照片
            </button>
          )}

          {/* ── Gallery ── */}
          <div className="pa__list">
            {loading ? (
              <div className="pa__dots"><span /><span /><span /></div>
            ) : photos.length === 0 ? (
              <p className="pa__empty">还没有照片，留下你们的第一张吧</p>
            ) : (
              <>
                {deleteErr && <p className="pa__delete-err">{deleteErr}</p>}
                {groups.map(([month, monthPhotos]) => (
                  <div key={month} className="pa__month-group">
                    <div className="pa__month-header">
                      <span className="pa__month-label">{month}</span>
                      <span className="pa__month-count">{monthPhotos.length} 张</span>
                    </div>
                    {monthPhotos.map(photo => (
                      <div key={photo.id} className="pa__photo-card">
                        <img
                          src={photo.photo_url}
                          className="pa__photo-img"
                          alt={photo.caption || ''}
                          loading="lazy"
                          onClick={() => setLightbox(photo.photo_url)}
                        />
                        {photo.caption && (
                          <p className="pa__photo-caption">{photo.caption}</p>
                        )}
                        <div className="pa__photo-meta">
                          <span className="pa__photo-author">
                            {profiles[photo.user_id] || '有人'}
                          </span>
                          <span className="pa__photo-date">
                            {formatPhotoDate(photo.created_at)}
                          </span>
                        </div>
                        {photo.user_id === user?.id && (
                          confirmId === photo.id ? (
                            <div className="pa__confirm">
                              <span className="pa__confirm-text">确认删除这张照片吗？</span>
                              <div className="pa__confirm-btns">
                                <button
                                  className="pa__confirm-yes"
                                  onClick={handleDeleteConfirm}
                                  disabled={deleting === photo.id}
                                >
                                  {deleting === photo.id ? '删除中…' : '确认删除'}
                                </button>
                                <button
                                  className="pa__confirm-no"
                                  onClick={() => setConfirmId(null)}
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="pa__delete-btn"
                              onClick={() => setConfirmId(photo.id)}
                              disabled={!!deleting}
                            >
                              删除
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
