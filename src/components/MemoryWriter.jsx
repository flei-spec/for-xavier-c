import { useState, useEffect, useRef } from 'react'
import { todayEntry, saveEntry } from '../utils/journal'
import './MemoryWriter.css'

const MAX = 160

export default function MemoryWriter({ mood, currentSong }) {
  const [today, setToday]   = useState(null)
  const [open, setOpen]     = useState(false)
  const [text, setText]     = useState('')
  const [flash, setFlash]   = useState(false)
  const textareaRef         = useRef(null)

  // Load any existing entry for today on mount
  useEffect(() => { setToday(todayEntry()) }, [])

  // Focus textarea when editor opens
  useEffect(() => {
    if (open) textareaRef.current?.focus()
  }, [open])

  const handleSave = () => {
    if (!text.trim()) return
    const entry = saveEntry({
      text:      text.trim(),
      moodId:    mood?.id    ?? null,
      moodLabel: mood?.label ?? null,
      moodIcon:  mood?.icon  ?? null,
      // Only persist title + artist — the CDN src URL may change
      song: currentSong?.title
        ? { title: currentSong.title, artist: currentSong.artist }
        : null,
    })
    setToday(entry)
    setText('')
    setOpen(false)
    setFlash(true)
    setTimeout(() => setFlash(false), 2800)
  }

  // ── Saved flash ────────────────────────────────────────────────────────────
  if (flash) {
    return (
      <div className="mw mw--flash">
        <span className="mw__flash-icon">✦</span>
        <span className="mw__flash-text">已记录</span>
      </div>
    )
  }

  // ── Already wrote today ────────────────────────────────────────────────────
  if (today) {
    return (
      <div className="mw mw--done">
        <p className="mw__done-label">今天已记录</p>
        <p className="mw__done-text">「{today.text}」</p>
      </div>
    )
  }

  // ── Editor open ────────────────────────────────────────────────────────────
  if (open) {
    return (
      <div className="mw mw--open">
        <p className="mw__prompt">写下此刻的感受</p>

        <textarea
          ref={textareaRef}
          className="mw__textarea"
          placeholder="今天听到这首歌，想到了…"
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX))}
          rows={3}
        />

        <div className="mw__footer">
          <span className="mw__chars">
            {text.length}
            <span className="mw__chars-max"> / {MAX}</span>
          </span>
          <div className="mw__btns">
            <button
              className="mw__cancel"
              onClick={() => { setOpen(false); setText('') }}
            >
              取消
            </button>
            <button
              className="mw__save"
              onClick={handleSave}
              disabled={!text.trim()}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Collapsed prompt ───────────────────────────────────────────────────────
  return (
    <div className="mw">
      <button className="mw__trigger" onClick={() => setOpen(true)}>
        <span className="mw__trigger-icon">✎</span>
        记录此刻
      </button>
    </div>
  )
}
