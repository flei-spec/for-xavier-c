import { useState, useEffect, useRef } from 'react'
import { saveNewEntry, randomOldEntry } from '../utils/journal'
import { useAuth } from '../contexts/AuthContext'
import './MemoryDiary.css'

const MAX = 160

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

export default function MemoryDiary({ onClose, onCloseAll, mood, currentSong }) {
  const { user, space } = useAuth()
  const [visible,   setVisible]   = useState(false)
  const [text,      setText]      = useState('')
  const [saved,     setSaved]     = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saveErr,   setSaveErr]   = useState('')
  // undefined = still loading  |  null = loaded & empty  |  object = loaded & has entry
  const [pastEntry, setPastEntry] = useState(undefined)
  const textareaRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true)
      textareaRef.current?.focus()
    }, 40)
    return () => clearTimeout(t)
  }, [])

  // Fetch a random past entry from this space on open
  useEffect(() => {
    if (!user) { setPastEntry(null); return }
    randomOldEntry({ spaceId: space?.id ?? null, userId: user.id })
      .then(entry => setPastEntry(entry ?? null))
      .catch(() => setPastEntry(null))
  }, [user?.id, space?.id])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 380)
  }

  const closeAll = () => {
    setVisible(false)
    setTimeout(onCloseAll ?? onClose, 380)
  }

  const handleSave = async () => {
    if (!text.trim() || saving) return
    setSaving(true)
    setSaveErr('')
    const ok = await saveNewEntry({
      text:      text.trim(),
      moodLabel: mood?.label ?? null,
      song: currentSong?.title
        ? { title: currentSong.title, artist: currentSong.artist }
        : null,
      spaceId:   space?.id ?? null,
      userId:    user?.id  ?? null,
      entryType: 'daily_note',
    })
    setSaving(false)
    if (ok) {
      setText('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      setSaveErr('保存好像出了点问题，再试一次？')
      setTimeout(() => setSaveErr(''), 3500)
    }
  }

  return (
    <div
      className={`diary__overlay ${visible ? 'diary__overlay--in' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div className="diary__modal">

        <button className="diary__back" onClick={close}>← 返回</button>
        <button className="diary__close" onClick={closeAll} aria-label="关闭">✕</button>

        <div className="diary__header">
          <span className="diary__icon">✎</span>
          <p className="diary__title">今天我想对你说…</p>
        </div>

        {/* ── Random past memory ── */}
        {pastEntry === null && (
          <p className="diary__echo diary__echo--empty">
            这里还没有被保存下来的话。
          </p>
        )}
        {pastEntry != null && pastEntry !== undefined && (
          <div className="diary__echo diary__echo--has">
            <span className="diary__echo-label">
              以前的你说过
              <span className="diary__echo-date">{formatDate(pastEntry.created_at)}</span>
            </span>
            <p className="diary__echo-text">「{pastEntry.content}」</p>
          </div>
        )}

        {/* ── Write new memory ── */}
        <textarea
          ref={textareaRef}
          className="diary__textarea"
          placeholder="今天听到这首歌，想到了…"
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX))}
          rows={4}
        />

        {saveErr && (
          <p className="diary__err">{saveErr}</p>
        )}

        <div className="diary__footer">
          <span className="diary__chars">
            {text.length}
            <span className="diary__chars-max"> / {MAX}</span>
          </span>
          <div className="diary__right">
            {saved && (
              <span className="diary__saved">我帮你存好了 ✦</span>
            )}
            <button
              className="diary__save"
              onClick={handleSave}
              disabled={!text.trim() || saving}
            >
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
