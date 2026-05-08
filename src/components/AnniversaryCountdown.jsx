import { useMemo, useState, useEffect } from 'react'
import { profile } from '../data/romanticProfile'
import './AnniversaryCountdown.css'

export default function AnniversaryCountdown() {
  const [noteIdx, setNoteIdx] = useState(0)

  const { daysTogether, daysUntil } = useMemo(() => {
    const now   = new Date()
    const start = new Date(profile.startDate)
    const anniv = new Date(profile.anniversaryDate)

    const next = new Date(anniv)
    next.setFullYear(now.getFullYear())
    if (next <= now) next.setFullYear(now.getFullYear() + 1)

    const MS = 1000 * 60 * 60 * 24
    return {
      daysTogether: Math.max(0, Math.floor((now - start) / MS)),
      daysUntil:    Math.max(0, Math.floor((next - now)  / MS)),
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNoteIdx(i => (i + 1) % profile.notes.length), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="countdown">
      <p className="countdown__label">我们的故事</p>

      <div className="countdown__stat">
        <span className="countdown__num">{daysTogether.toLocaleString()}</span>
        <span className="countdown__unit">天，在一起</span>
      </div>

      <div className="countdown__line" />

      <div className="countdown__stat">
        <span className="countdown__num countdown__num--soft">
          {daysUntil === 0 ? '🎉' : daysUntil}
        </span>
        <span className="countdown__unit">
          {daysUntil === 0 ? '纪念日快乐 🎉' : '天后，是我们的纪念日'}
        </span>
      </div>

      <div className="countdown__line" />

      <p className="countdown__note" key={noteIdx}>
        「{profile.notes[noteIdx]}」
      </p>
    </div>
  )
}
