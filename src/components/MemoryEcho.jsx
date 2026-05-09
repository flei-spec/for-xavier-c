import { useState, useEffect } from 'react'
import { randomOldEntry } from '../utils/journal'
import './MemoryEcho.css'

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

// Displays a randomly chosen past memory on the welcome page.
// Returns null when there are no old entries so no space is reserved.
export default function MemoryEcho() {
  const [entry, setEntry] = useState(undefined)   // undefined = not yet resolved

  useEffect(() => {
    // Read synchronously but inside effect so it never blocks first paint.
    setEntry(randomOldEntry())   // null if nothing to show
  }, [])

  if (entry == null) return null

  return (
    <div className="echo">
      <p className="echo__lead">以前的你说过</p>

      <blockquote className="echo__quote">
        「{entry.text}」
      </blockquote>

      <div className="echo__meta">
        <span className="echo__date">{formatDate(entry.date)}</span>

        {entry.moodLabel && (
          <span className="echo__mood">
            {entry.moodIcon} {entry.moodLabel}
          </span>
        )}

        {entry.song?.title && (
          <span className="echo__song">🎵 {entry.song.title}</span>
        )}
      </div>
    </div>
  )
}
