import { useState, useEffect, useMemo } from 'react'
import { profile } from '../data/romanticProfile'
import { useAuth } from '../contexts/AuthContext'
import { loadMeetingDate, saveMeetingDate } from '../lib/meetingDate'
import { shanghaiTodayStr, daysBetween, shanghaiYear } from '../utils/relationshipTime'
import AuthModal from './AuthModal'
import './AnniversaryCountdown.css'

// Profile-default fallback is only used for this specific couple space.
const PRIVATE_SPACE_ID = '89f07d46-af87-4aea-b7e8-e4a804cb21d1'

const WAITING_LINES = [
  '再等一下，我们就快见面了。',
  '倒计时的每一天都是你。',
  '我已经想好见面第一件事要做什么了。',
  '快了，真的快了。',
]

function romanticLine(days) {
  return WAITING_LINES[days % WAITING_LINES.length]
}

function calcDays(dateStr) {
  if (!dateStr) return null
  return daysBetween(shanghaiTodayStr(), dateStr)
}

function formatChinese(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

// Sensible edit-form default when no date has been set yet.
function nextMonthDate() {
  const [y, m] = shanghaiTodayStr().split('-').map(Number)
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  return `${nextY}-${String(nextM).padStart(2, '0')}-01`
}

const THIS_YEAR = shanghaiYear()
const YEARS  = Array.from({ length: 6 }, (_, i) => THIS_YEAR + i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1)

export default function MeetingCountdown() {
  const { user, space, loadingAuth, loadingSpace } = useAuth()

  const [meetingDate, setMeetingDate] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [showAuth,    setShowAuth]    = useState(false)
  const [editing,     setEditing]     = useState(false)
  const [editYear,    setEditYear]    = useState(0)
  const [editMonth,   setEditMonth]   = useState(0)
  const [editDay,     setEditDay]     = useState(0)
  const [editError,   setEditError]   = useState('')
  const [saving,      setSaving]      = useState(false)

  // Load from Supabase once auth + space are resolved
  useEffect(() => {
    if (loadingAuth || loadingSpace) return
    if (!user) { setLoading(false); return }

    const spaceId = space?.id ?? null
    console.log('[MeetingCountdown] current user:', user.id)
    console.log('[MeetingCountdown] current space:', spaceId)
    console.log('[MeetingCountdown] relationship query mode:', spaceId ? 'space' : 'solo')

    loadMeetingDate({ userId: user.id, spaceId }).then(date => {
      console.log('[MeetingCountdown] loaded relationship settings:', date)
      if (date) {
        setMeetingDate(date)
      } else if (spaceId === PRIVATE_SPACE_ID) {
        // No custom date saved yet → fall back to the profile default so
        // the card is never blank inside the private couple space.
        console.log('[MeetingCountdown] no DB row yet — using profile fallback for private space')
        setMeetingDate(profile.meetingDate)
      }
      // Other accounts/spaces: stays null → shows "还没有设置" placeholder
      setLoading(false)
    })
  }, [user?.id, space?.id, loadingAuth, loadingSpace])

  const days    = useMemo(() => calcDays(meetingDate), [meetingDate])
  const isToday = days === 0
  const isPast  = days !== null && days < 0
  const displayDays = days === null ? null : Math.max(0, days)

  const startEditing = () => {
    const base = meetingDate ?? nextMonthDate()
    const [y, m, d] = base.split('-').map(Number)
    setEditYear(y)
    setEditMonth(m)
    setEditDay(d)
    setEditError('')
    setEditing(true)
  }

  const handleSave = async () => {
    const y = editYear
    const m = editMonth
    const d = editDay
    const check = new Date(y, m - 1, d)
    if (check.getFullYear() !== y || check.getMonth() + 1 !== m || check.getDate() !== d) {
      setEditError('日期无效，请重新选择')
      return
    }
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    setSaving(true)
    const ok = await saveMeetingDate({
      userId:  user?.id  ?? null,
      spaceId: space?.id ?? null,
      date:    dateStr,
    })
    setSaving(false)
    if (ok) {
      setMeetingDate(dateStr)
      setEditing(false)
    } else {
      setEditError('保存失败，请重试')
    }
  }

  // ── Loading shell ──────────────────────────────────────────────────────────
  if (loadingAuth || loadingSpace) {
    return <div className="countdown"><p className="countdown__label">见面倒计时</p></div>
  }

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="countdown">
        <p className="countdown__label">见面倒计时</p>
        <button className="countdown__login-btn" onClick={() => setShowAuth(true)}>
          请先登录 / 注册
        </button>
        {showAuth && <AuthModal onSuccess={() => setShowAuth(false)} />}
      </div>
    )
  }

  // ── Logged in but no date set ─────────────────────────────────────────────────
  if (!loading && days === null) {
    return (
      <div className="countdown">
        <p className="countdown__label">见面倒计时</p>
        {editing ? (
          // Reuse the same edit form
          <div className="countdown__form">
            <div className="countdown__selects">
              <select className="countdown__select" value={editYear}  onChange={e => setEditYear(+e.target.value)}>
                {YEARS.map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
              <select className="countdown__select" value={editMonth} onChange={e => setEditMonth(+e.target.value)}>
                {MONTHS.map(m => <option key={m} value={m}>{m}月</option>)}
              </select>
              <select className="countdown__select" value={editDay}   onChange={e => setEditDay(+e.target.value)}>
                {DAYS.map(d => <option key={d} value={d}>{d}日</option>)}
              </select>
            </div>
            {editError && <p className="countdown__form-error">{editError}</p>}
            <div className="countdown__form-btns">
              <button className="countdown__form-save" onClick={handleSave} disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </button>
              <button className="countdown__form-cancel" onClick={() => setEditing(false)}>取消</button>
            </div>
            {space && <p className="countdown__form-scope">将同步给你们两个人</p>}
          </div>
        ) : (
          <>
            <div className="countdown__line" />
            <p className="countdown__note" style={{ opacity: 0.45 }}>「还没有设置见面日期」</p>
            <button className="countdown__edit-btn" onClick={startEditing} title="设置日期">
              ✎ 设置
            </button>
          </>
        )}
      </div>
    )
  }

  // ── Full countdown ────────────────────────────────────────────────────────────
  return (
    <div className="countdown">
      <p className="countdown__label">见面倒计时</p>

      <div className="countdown__date-row">
        <span className="countdown__date">
          {loading ? '…' : formatChinese(meetingDate)}
        </span>
        {!loading && !editing && (
          <button className="countdown__edit-btn" onClick={startEditing} title="修改日期">✎</button>
        )}
      </div>

      {editing && (
        <div className="countdown__form">
          <div className="countdown__selects">
            <select className="countdown__select" value={editYear}  onChange={e => setEditYear(+e.target.value)}>
              {YEARS.map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select className="countdown__select" value={editMonth} onChange={e => setEditMonth(+e.target.value)}>
              {MONTHS.map(m => <option key={m} value={m}>{m}月</option>)}
            </select>
            <select className="countdown__select" value={editDay}   onChange={e => setEditDay(+e.target.value)}>
              {DAYS.map(d => <option key={d} value={d}>{d}日</option>)}
            </select>
          </div>
          {editError && <p className="countdown__form-error">{editError}</p>}
          <div className="countdown__form-btns">
            <button className="countdown__form-save" onClick={handleSave} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </button>
            <button className="countdown__form-cancel" onClick={() => setEditing(false)}>取消</button>
          </div>
          {space && <p className="countdown__form-scope">将同步给你们两个人</p>}
        </div>
      )}

      <div className="countdown__stat">
        <span className="countdown__num countdown__num--soft">
          {displayDays}
        </span>
        <span className="countdown__unit">
          {isToday ? '今天见面啦' : isPast ? '已经见面啦' : '天后，就可以见面了'}
        </span>
      </div>

      <div className="countdown__line" />

      <p className="countdown__note">
        「{isToday ? '今天见面啦，好想你。' : isPast ? '见面了，真好。' : romanticLine(days)}」
      </p>
    </div>
  )
}
