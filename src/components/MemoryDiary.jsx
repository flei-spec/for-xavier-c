import { useState, useEffect, useRef } from 'react'
import { saveNewEntry } from '../utils/journal'
import { useAuth } from '../contexts/AuthContext'
import './MemoryDiary.css'

const MAX = 160

export default function MemoryDiary({ onClose, mood, currentSong }) {
  const { user, space } = useAuth()
  const [visible, setVisible] = useState(false)
  const [text,    setText]    = useState('')
  const [saved,   setSaved]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true)
      textareaRef.current?.focus()
    }, 40)
    return () => clearTimeout(t)
  }, [])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 380)
  }

  const handleSave = async () => {
    if (!text.trim() || saving) return
    console.log('[MemoryDiary] saving new entry — space:', space?.id ?? 'none', '| user:', user?.id)
    setSaving(true)
    const ok = await saveNewEntry({
      text:      text.trim(),
      moodLabel: mood?.label ?? null,
      song: currentSong?.title
        ? { title: currentSong.title, artist: currentSong.artist }
        : null,
      spaceId: space?.id ?? null,
      userId:  user?.id  ?? null,
    })
    setSaving(false)
    if (ok) {
      setText('')       // clear so a new entry can be written
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    }
  }

  return (
    <div
      className={`diary__overlay ${visible ? 'diary__overlay--in' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div className="diary__modal">

        <button className="diary__close" onClick={close} aria-label="关闭">✕</button>

        <div className="diary__header">
          <span className="diary__icon">✎</span>
          <p className="diary__title">今天我想对你说…</p>
        </div>

        <textarea
          ref={textareaRef}
          className="diary__textarea"
          placeholder="今天听到这首歌，想到了…"
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX))}
          rows={4}
        />

        <div className="diary__footer">
          <span className="diary__chars">
            {text.length}
            <span className="diary__chars-max"> / {MAX}</span>
          </span>
          <div className="diary__right">
            {saved && <span className="diary__saved">已保存 ✦</span>}
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
