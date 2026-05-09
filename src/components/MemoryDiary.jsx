import { useState, useEffect, useRef } from 'react'
import { todayEntry, saveTodayEntry } from '../utils/journal'
import './MemoryDiary.css'

const MAX = 160

export default function MemoryDiary({ onClose, mood, currentSong }) {
  const [visible,  setVisible]  = useState(false)
  const [text,     setText]     = useState('')
  const [existing, setExisting] = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const textareaRef = useRef(null)

  // Fetch today's entry from Supabase, then slide in
  useEffect(() => {
    todayEntry().then(entry => {
      if (entry) {
        setText(entry.content)
        setExisting(true)
      }
      setTimeout(() => {
        setVisible(true)
        textareaRef.current?.focus()
      }, 40)
    })
  }, [])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 380)
  }

  const handleSave = async () => {
    console.log('[MemoryDiary] save button clicked, text:', text.trim())
    if (!text.trim() || saving) return
    setSaving(true)
    console.log('[MemoryDiary] calling saveTodayEntry, mood:', mood?.label, 'song:', currentSong?.title)
    await saveTodayEntry({
      text:      text.trim(),
      moodLabel: mood?.label ?? null,
      song: currentSong?.title
        ? { title: currentSong.title, artist: currentSong.artist }
        : null,
    })
    console.log('[MemoryDiary] saveTodayEntry returned, marking saved')
    setSaving(false)
    setExisting(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
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
          <p className="diary__title">
            {existing ? '今天的记忆' : '写一条今天的记忆'}
          </p>
          {existing && (
            <p className="diary__subtitle">可以继续编辑</p>
          )}
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
              disabled={!text.trim() || saved || saving}
            >
              {saving ? '保存中…' : existing ? '更新' : '保存'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
