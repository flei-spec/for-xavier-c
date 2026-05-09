import { useMemo } from 'react'
import { profile } from '../data/romanticProfile'
import './AnniversaryCountdown.css'   // reuses all .countdown* classes

// ── Romantic lines that rotate through while waiting ───────────────────────────
const WAITING_LINES = [
  '再等一下，我们就快见面了。',
  '倒计时的每一天都是你。',
  '我已经想好见面第一件事要做什么了。',
  '快了，真的快了。',
]

function romanticLine(days) {
  // Deterministic pick based on days remaining so it doesn't jump on re-render
  return WAITING_LINES[days % WAITING_LINES.length]
}

export default function MeetingCountdown() {
  const days = useMemo(() => {
    const now    = new Date()
    const target = new Date(profile.meetingDate)
    // Compare date-only (strip time) so the card flips at midnight
    now.setHours(0, 0, 0, 0)
    target.setHours(0, 0, 0, 0)
    return Math.floor((target - now) / (1000 * 60 * 60 * 24))
  }, [])

  const met = days <= 0

  return (
    <div className="countdown">
      <p className="countdown__label">见面倒计时</p>

      <div className="countdown__stat">
        <span className="countdown__num countdown__num--soft">
          {met ? '🌸' : days}
        </span>
        <span className="countdown__unit">
          {met ? '今天就见面啦 🌸' : '天后，就可以见面了'}
        </span>
      </div>

      <div className="countdown__line" />

      <p className="countdown__note">
        「{met ? '终于见面了，好想你。' : romanticLine(days)}」
      </p>
    </div>
  )
}
