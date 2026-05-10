import { useMemo, useState, useEffect } from 'react'
import { profile } from '../data/romanticProfile'
import { useAuth } from '../contexts/AuthContext'
import './AnniversaryCountdown.css'

// Private anniversary data is only visible inside this couple space.
const PRIVATE_SPACE_ID = '89f07d46-af87-4aea-b7e8-e4a804cb21d1'

export default function AnniversaryCountdown() {
  const { user, space, loadingAuth, loadingSpace } = useAuth()
  const [noteIdx, setNoteIdx] = useState(0)

  const isPrivateTargetSpace = space?.id === PRIVATE_SPACE_ID

  console.log('[AnniversaryCountdown] currentSpace id:', space?.id ?? 'none')
  console.log('[AnniversaryCountdown] isPrivateTargetSpace:', isPrivateTargetSpace)
  console.log('[AnniversaryCountdown] story data source:', isPrivateTargetSpace ? 'private profile' : 'n/a (placeholder)')

  const { daysTogether, daysUntil } = useMemo(() => {
    if (!isPrivateTargetSpace) return { daysTogether: 0, daysUntil: 0 }

    const now   = new Date()
    const start = new Date(profile.startDate)
    const anniv = new Date(profile.anniversaryDate)

    const next = new Date(anniv)
    next.setFullYear(now.getFullYear())
    if (next <= now) next.setFullYear(now.getFullYear() + 1)

    const MS = 1000 * 60 * 60 * 24
    return {
      daysTogether: Math.max(1, Math.floor((now - start) / MS) + 1),
      daysUntil:    Math.max(0, Math.floor((next - now)  / MS)),
    }
  }, [isPrivateTargetSpace])

  useEffect(() => {
    const t = setInterval(() => setNoteIdx(i => (i + 1) % profile.notes.length), 5000)
    return () => clearInterval(t)
  }, [])

  // Wait for space to resolve before deciding what to show
  if (loadingAuth || loadingSpace) {
    return <div className="countdown"><p className="countdown__label">我们的故事</p></div>
  }

  // ── Public / placeholder version ──────────────────────────────────────────
  // Shown for: guest, not logged in, no space, wrong space
  if (!isPrivateTargetSpace) {
    return (
      <div className="countdown">
        <p className="countdown__label">我们的故事</p>
        <div className="countdown__line" />
        <p className="countdown__note">「在这里记录你们在一起的每一天」</p>
      </div>
    )
  }

  // ── Private version: only for the authorized couple space ─────────────────
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
