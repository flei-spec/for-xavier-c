import { useState, useEffect, useMemo } from 'react'
import { profile } from '../data/romanticProfile'
import { useAuth } from '../contexts/AuthContext'
import { loadMeetingDate, saveMeetingDate } from '../lib/meetingDate'
import AuthModal from './AuthModal'
import './AnniversaryCountdown.css'

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
  const now    = new Date()
  const target = new Date(dateStr)
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.floor((target - now) / (1000 * 60 * 60 * 24))
}

function formatChinese(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

const THIS_YEAR = new Date().getFullYear()
const YEARS  = Array.from({ length: 5 }, (_, i) => THIS_YEAR + i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1)

export default function MeetingCountdown() {
  const { user, space, loadingAuth, loadingSpace } = useAuth()

  const [meetingDate, setMeetingDate] = useState(profile.meetingDate)
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

    const userId  = user.id
    const spaceId = space?.id ?? null
    loadMeetingDate({ userId, spaceId }).then(date => {
      if (date) setMeetingDate(date)
      setLoading(false)
    })
  }, [user?.id, space?.id, loadingAuth, loadingSpace])

  const days = useMemo(() => calcDays(meetingDate), [meetingDate])
  const met  = days <= 0

  const startEditing = () => {
    const [y, m, d] = meetingDate.split('-').map(Number)
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
    // Validate date is real (e.g. rejects Feb 30)
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

  // Still loading auth — render the shell without content to avoid flashing
  if (loadingAuth) {
    return (
      <div className="countdown">
        <p className="countdown__label">见面倒计时</p>
      </div>
    )
  }

  // Not logged in — show login prompt instead of countdown
  if (!user) {
    return (
      <div className="countdown">
        <p className="countdown__label">见面倒计时</p>
        <button
          className="countdown__login-btn"
          onClick={() => setShowAuth(true)}
        >
          请先登录 / 注册
        </button>
        {showAuth && (
          <AuthModal onSuccess={() => setShowAuth(false)} />
        )}
      </div>
    )
  }

  return (
    <div className="countdown">
      <p className="countdown__label">见面倒计时</p>

      {/* Date display + edit button */}
      <div className="countdown__date-row">
        <span className="countdown__date">
          {loading ? '…' : formatChinese(meetingDate)}
        </span>
        {!loading && !editing && (
          <button className="countdown__edit-btn" onClick={startEditing} title="修改日期">✎</button>
        )}
      </div>

      {/* Edit form */}
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
          {space && (
            <p className="countdown__form-scope">将同步给你们两个人</p>
          )}
        </div>
      )}

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
