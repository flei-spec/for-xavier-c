import { useState, useEffect } from 'react'
import { fetchAllEntries, deleteEntry } from '../utils/journal'
import { fetchVoiceMessages, deleteVoiceMessage } from '../utils/voiceMessages'
import { getProfiles } from '../lib/profiles'
import { useAuth } from '../contexts/AuthContext'
import './DiaryRecords.css'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function fmtDuration(ms) {
  if (!ms) return ''
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── Text records tab ──────────────────────────────────────────────────────────

function TextTab({ user, space }) {
  const [entries,    setEntries]    = useState([])
  const [profileMap, setProfileMap] = useState({})
  const [loading,    setLoading]    = useState(true)
  const [deleting,   setDeleting]   = useState(null)
  const [confirmId,  setConfirmId]  = useState(null)
  const [deleteErr,  setDeleteErr]  = useState('')

  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetchAllEntries({ spaceId: space?.id ?? null, userId: user.id }).then(async rows => {
      setEntries(rows)
      const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
      if (ids.length > 0) {
        const map = await getProfiles(ids)
        setProfileMap(map)
      }
      setLoading(false)
    })
  }, [user?.id, space?.id])

  const handleDeleteRequest = id => { setConfirmId(id); setDeleteErr('') }
  const handleDeleteCancel  = ()  => setConfirmId(null)
  const handleDeleteConfirm = async () => {
    const id = confirmId
    setConfirmId(null)
    setDeleting(id)
    const ok = await deleteEntry(id)
    setDeleting(null)
    if (ok) {
      setEntries(prev => prev.filter(e => e.id !== id))
    } else {
      setDeleteErr('删除失败，请重试')
      setTimeout(() => setDeleteErr(''), 3000)
    }
  }

  if (loading) return <p className="dr__empty">加载中…</p>
  if (entries.length === 0) return <p className="dr__empty">还没有任何文字记录。</p>

  return (
    <>
      {deleteErr && <p className="dr__delete-err">{deleteErr}</p>}
      {entries.map(entry => {
        const authorName = profileMap[entry.user_id] || '有人'
        const typeLabel  = entry.entry_type === 'secret_letter' ? '悄悄话' : '今天我想说'
        return (
          <div key={entry.id} className="dr__entry">
            <div className="dr__entry-type-row">
              <span className="dr__entry-author">{authorName}</span>
              <span className="dr__entry-type">{typeLabel}</span>
            </div>
            <div className="dr__entry-meta">
              <span className="dr__entry-date">{formatDate(entry.created_at)}</span>
              {entry.mood && <span className="dr__entry-mood">{entry.mood}</span>}
            </div>
            {entry.title && <p className="dr__entry-song">♪ {entry.title}</p>}
            <p className="dr__entry-content">{entry.content}</p>
            {confirmId === entry.id ? (
              <div className="dr__confirm">
                <span className="dr__confirm-text">确认删除这条记录吗？</span>
                <div className="dr__confirm-btns">
                  <button className="dr__confirm-yes" onClick={handleDeleteConfirm} disabled={deleting === entry.id}>
                    {deleting === entry.id ? '删除中…' : '确认删除'}
                  </button>
                  <button className="dr__confirm-no" onClick={handleDeleteCancel}>取消</button>
                </div>
              </div>
            ) : (
              <button className="dr__delete" onClick={() => handleDeleteRequest(entry.id)} disabled={deleting === entry.id}>
                删除
              </button>
            )}
          </div>
        )
      })}
    </>
  )
}

// ── Voice records tab ─────────────────────────────────────────────────────────

function VoiceTab({ user, space }) {
  const [messages,   setMessages]   = useState([])
  const [profileMap, setProfileMap] = useState({})
  const [loading,    setLoading]    = useState(true)
  const [deleting,   setDeleting]   = useState(null)
  const [confirmId,  setConfirmId]  = useState(null)
  const [deleteErr,  setDeleteErr]  = useState('')

  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetchVoiceMessages({ spaceId: space?.id ?? null, userId: user.id }).then(async msgs => {
      setMessages(msgs)
      // Fetch author names
      const ids = [...new Set(msgs.map(m => m.user_id).filter(Boolean))]
      if (ids.length > 0) {
        const map = await getProfiles(ids)
        setProfileMap(map)
      }
      setLoading(false)
    })
  }, [user?.id, space?.id])

  const handleDeleteRequest = id => { setConfirmId(id); setDeleteErr('') }
  const handleDeleteCancel  = ()  => setConfirmId(null)
  const handleDeleteConfirm = async () => {
    const msg = messages.find(m => m.id === confirmId)
    setConfirmId(null)
    setDeleting(msg.id)
    const ok = await deleteVoiceMessage(msg.id, msg.storage_path)
    setDeleting(null)
    if (ok) {
      setMessages(prev => prev.filter(m => m.id !== msg.id))
    } else {
      setDeleteErr('删除失败，请重试')
      setTimeout(() => setDeleteErr(''), 3000)
    }
  }

  if (loading) return <p className="dr__empty">加载中…</p>
  if (messages.length === 0) return <p className="dr__empty">还没有语音留言。</p>

  return (
    <>
      {deleteErr && <p className="dr__delete-err">{deleteErr}</p>}
      {messages.map(msg => {
        const authorName = profileMap[msg.user_id] || '有人'
        return (
          <div key={msg.id} className="dr__entry">
            <div className="dr__entry-type-row">
              <span className="dr__entry-author">{authorName}</span>
              <span className="dr__entry-type dr__entry-type--voice">语音</span>
            </div>
            <div className="dr__entry-meta">
              <span className="dr__entry-date">{formatDate(msg.created_at)}</span>
              {msg.duration_ms && (
                <span className="dr__entry-duration">{fmtDuration(msg.duration_ms)}</span>
              )}
            </div>
            {msg.audio_url ? (
              <audio
                className="dr__audio"
                src={msg.audio_url}
                controls
                preload="metadata"
              />
            ) : (
              <p className="dr__audio-loading">音频地址不可用</p>
            )}
            {confirmId === msg.id ? (
              <div className="dr__confirm">
                <span className="dr__confirm-text">确认删除这条语音吗？</span>
                <div className="dr__confirm-btns">
                  <button className="dr__confirm-yes" onClick={handleDeleteConfirm} disabled={deleting === msg.id}>
                    {deleting === msg.id ? '删除中…' : '确认删除'}
                  </button>
                  <button className="dr__confirm-no" onClick={handleDeleteCancel}>取消</button>
                </div>
              </div>
            ) : (
              <button className="dr__delete" onClick={() => handleDeleteRequest(msg.id)} disabled={deleting === msg.id}>
                删除
              </button>
            )}
          </div>
        )
      })}
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function DiaryRecords({ onClose }) {
  const { user, space } = useAuth()
  const [visible,    setVisible]    = useState(false)
  const [activeTab,  setActiveTab]  = useState('text')   // 'text' | 'voice'

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 380)
  }

  return (
    <div
      className={`dr__overlay ${visible ? 'dr__overlay--in' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div className="dr__modal">
        <button className="dr__close" onClick={close} aria-label="关闭">✕</button>

        <div className="dr__header">
          <span className="dr__icon">📖</span>
          <p className="dr__title">我们的记录</p>
        </div>

        {/* ── Tabs ── */}
        <div className="dr__tabs">
          <button
            className={`dr__tab ${activeTab === 'text'  ? 'dr__tab--active' : ''}`}
            onClick={() => setActiveTab('text')}
          >文字类型</button>
          <button
            className={`dr__tab ${activeTab === 'voice' ? 'dr__tab--active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >语音类型</button>
        </div>

        <div className="dr__list">
          {activeTab === 'text'  && <TextTab  user={user} space={space} />}
          {activeTab === 'voice' && <VoiceTab user={user} space={space} />}
        </div>
      </div>
    </div>
  )
}
