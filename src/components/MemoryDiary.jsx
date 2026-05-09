import { useState, useEffect, useRef } from 'react'
import { todayEntry, saveTodayEntry } from '../utils/journal'
import './MemoryDiary.css'

const MAX = 160

export default function MemoryDiary({ onClose, mood, currentSong }) {
  const [visible,  setVisible]  = useState(false)
  const [text,     setText]     = useState('')
  const [existing, setExisting] = useState(false)  // today already had an entry
  const [saved,    setSaved]    = useState(false)   // post-save confirmation tick
  const textareaRef = useRef(null)

  // Slide in + pre-fill if today has an entry
  useEffect(() => {
    const entry = todayEntry()
    if (entry) {
      setText(entry.text)
      setExisting(true)
    }
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

  const handleSave = () => {
    if (!text.trim()) return
    saveTodayEntry({
      text:      text.trim(),
      moodId:    mood?.id    ?? null,
      moodLabel: mood?.label ?? null,
      moodIcon:  mood?.icon  ?? null,
      // Persist title + artist only — CDN URL is ephemeral
      song: currentSong?.title
        ? { title: currentSong.title, artist: currentSong.artist }
        : null,
    })
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
              disabled={!text.trim() || saved}
            >
              {existing ? '更新' : '保存'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
