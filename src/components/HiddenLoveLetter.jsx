import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { randomOldEntry } from '../utils/journal'
import './HiddenLoveLetter.css'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default function HiddenLoveLetter({ onClose }) {
  const { user, space } = useAuth()
  const [visible, setVisible] = useState(false)
  const [entry,   setEntry]   = useState(undefined)  // undefined=loading, null=none

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!user) { setEntry(null); return }
    randomOldEntry({
      spaceId: space?.id ?? null,
      userId:  user.id,
    }).then(setEntry)
  }, [user?.id, space?.id])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 380)
  }

  return (
    <div
      className={`letter__overlay ${visible ? 'letter__overlay--in' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div className="letter__modal">
        <button className="letter__close" onClick={close}>✕</button>

        <div className="letter__header">
          <span className="letter__seal">💌</span>
          <p className="letter__stamp">昨天的悄悄话</p>
        </div>

        <div className="letter__body">
          {entry === undefined && (
            <p className="letter__para letter__state">读取中…</p>
          )}

          {entry === null && (
            <p className="letter__para letter__state">
              还没有过去的记忆。{'\n'}今天写下的，明天就会在这里等你。
            </p>
          )}

          {entry != null && entry !== undefined && (
            <>
              <p className="letter__para letter__para--first">{entry.content}</p>
              <p className="letter__date">{formatDate(entry.created_at)}</p>
            </>
          )}
        </div>

        <div className="letter__footer">✦</div>
      </div>
    </div>
  )
}
