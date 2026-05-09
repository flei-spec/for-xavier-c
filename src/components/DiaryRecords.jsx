import { useState, useEffect } from 'react'
import { fetchAllEntries, deleteEntry } from '../utils/journal'
import { useAuth } from '../contexts/AuthContext'
import './DiaryRecords.css'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', {
    month: 'long',
    day:   'numeric',
    hour:  '2-digit',
    minute:'2-digit',
  })
}

export default function DiaryRecords({ onClose }) {
  const { user, space } = useAuth()
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [visible,  setVisible]  = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetchAllEntries({ spaceId: space?.id ?? null, userId: user.id }).then(rows => {
      setEntries(rows)
      setLoading(false)
    })
  }, [user?.id, space?.id])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 380)
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    const ok = await deleteEntry(id)
    setDeleting(null)
    if (ok) setEntries(prev => prev.filter(e => e.id !== id))
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
          <p className="dr__subtitle">{entries.length > 0 ? `${entries.length} 条记忆` : ''}</p>
        </div>

        <div className="dr__list">
          {loading && (
            <p className="dr__empty">加载中…</p>
          )}

          {!loading && entries.length === 0 && (
            <p className="dr__empty">还没有任何记录。</p>
          )}

          {!loading && entries.map(entry => (
            <div key={entry.id} className="dr__entry">
              <div className="dr__entry-meta">
                <span className="dr__entry-date">{formatDate(entry.created_at)}</span>
                {entry.mood && (
                  <span className="dr__entry-mood">{entry.mood}</span>
                )}
              </div>
              {entry.title && (
                <p className="dr__entry-song">♪ {entry.title}</p>
              )}
              <p className="dr__entry-content">{entry.content}</p>
              <button
                className="dr__delete"
                onClick={() => handleDelete(entry.id)}
                disabled={deleting === entry.id}
              >
                {deleting === entry.id ? '删除中…' : '删除'}
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
