import { useMemo, useState, useEffect } from 'react'
import { profile } from '../data/romanticProfile'
import { useAuth } from '../contexts/AuthContext'
import { loadStoryStartDate, saveStoryStartDate } from '../lib/relationshipSettings'
import './AnniversaryCountdown.css'

// Anniversary/notes section is only shown inside this couple space.
const PRIVATE_SPACE_ID = '89f07d46-af87-4aea-b7e8-e4a804cb21d1'

const THIS_YEAR = new Date().getFullYear()
const YEARS  = Array.from({ length: 11 }, (_, i) => THIS_YEAR - 10 + i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1)

function calcDaysTogether(dateStr) {
  if (!dateStr) return null
  const now   = new Date()
  const start = new Date(dateStr)
  now.setHours(0, 0, 0, 0)
  start.setHours(0, 0, 0, 0)
  return Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1)
}

function calcDaysUntilAnniv(anniversaryDateStr) {
  const now   = new Date()
  const anniv = new Date(anniversaryDateStr)
  const next  = new Date(anniv)
  next.setFullYear(now.getFullYear())
  if (next <= now) next.setFullYear(now.getFullYear() + 1)
  now.setHours(0, 0, 0, 0)
  next.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((next - now) / (1000 * 60 * 60 * 24)))
}

function todayDateStr() {
  return new Date().toISOString().split('T')[0]
}

export default function AnniversaryCountdown() {
  const { user, space, loadingAuth, loadingSpace } = useAuth()

  const [storyDate, setStoryDate] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState(false)
  const [editYear,  setEditYear]  = useState(0)
  const [editMonth, setEditMonth] = useState(0)
  const [editDay,   setEditDay]   = useState(0)
  const [editError, setEditError] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [noteIdx,   setNoteIdx]   = useState(0)

  const isPrivateSpace = space?.id === PRIVATE_SPACE_ID

  useEffect(() => {
    if (loadingAuth || loadingSpace) return
    if (!user) { setLoading(false); return }

    loadStoryStartDate({ userId: user.id, spaceId: space?.id ?? null }).then(date => {
      if (date) setStoryDate(date)
      setLoading(false)
    })
  }, [user?.id, space?.id, loadingAuth, loadingSpace])

  useEffect(() => {
    const t = setInterval(() => setNoteIdx(i => (i + 1) % profile.notes.length), 5000)
    return () => clearInterval(t)
  }, [])

  const daysTogether   = useMemo(() => calcDaysTogether(storyDate), [storyDate])
  const daysUntilAnniv = useMemo(
    () => isPrivateSpace ? calcDaysUntilAnniv(profile.anniversaryDate) : null,
    [isPrivateSpace],
  )

  const startEditing = () => {
    const base = storyDate ?? todayDateStr()
    const [y, m, d] = base.split('-').map(Number)
    setEditYear(y)
    setEditMonth(m)
    setEditDay(d)
    setEditError('')
    setEditing(true)
  }

  const handleSave = async () => {
    const y = editYear, m = editMonth, d = editDay
    const check = new Date(y, m - 1, d)
    if (check.getFullYear() !== y || check.getMonth() + 1 !== m || check.getDate() !== d) {
      setEditError('日期无效，请重新选择')
      return
    }
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    setSaving(true)
    const ok = await saveStoryStartDate({
      userId:  user?.id  ?? null,
      spaceId: space?.id ?? null,
      date:    dateStr,
    })
    setSaving(false)
    if (ok) { setStoryDate(dateStr); setEditing(false) }
    else setEditError('保存失败，请重试')
  }

  const DateForm = () => (
    <div className="countdown__form">
      <div className="countdown__selects">
        <select className="countdown__select" value={editYear}  onChange={e => setEditYear(+e.target.value)}>
          {YEARS.map(y  => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select className="countdown__select" value={editMonth} onChange={e => setEditMonth(+e.target.value)}>
          {MONTHS.map(m => <option key={m} value={m}>{m}月</option>)}
        </select>
        <select className="countdown__select" value={editDay}   onChange={e => setEditDay(+e.target.value)}>
          {DAYS.map(d   => <option key={d} value={d}>{d}日</option>)}
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
  )

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingAuth || loadingSpace) {
    return <div className="countdown"><p className="countdown__label">我们的故事</p></div>
  }

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="countdown">
        <p className="countdown__label">我们的故事</p>
        <div className="countdown__line" />
        <p className="countdown__note">「登录后即可记录你们在一起的每一天」</p>
      </div>
    )
  }

  // ── Logged in, no date set ─────────────────────────────────────────────────
  if (!loading && daysTogether === null) {
    return (
      <div className="countdown">
        <p className="countdown__label">我们的故事</p>
        {editing ? <DateForm /> : (
          <>
            <div className="countdown__line" />
            <p className="countdown__note" style={{ opacity: 0.45 }}>「还没有设置故事开始日期」</p>
            <button className="countdown__edit-btn" onClick={startEditing} title="设置日期">
              ✎ 立即设置
            </button>
          </>
        )}
      </div>
    )
  }

  // ── Logged in, date set ────────────────────────────────────────────────────
  return (
    <div className="countdown">
      <p className="countdown__label">我们的故事</p>

      <div className="countdown__stat">
        <span className="countdown__num">{loading ? '…' : daysTogether?.toLocaleString()}</span>
        <span className="countdown__unit">天，在一起</span>
      </div>

      {!loading && !editing && (
        <button className="countdown__edit-btn" onClick={startEditing} title="修改开始日期">✎</button>
      )}

      {editing && <DateForm />}

      <div className="countdown__line" />

      {isPrivateSpace && daysUntilAnniv !== null && (
        <>
          <div className="countdown__stat">
            <span className="countdown__num countdown__num--soft">
              {daysUntilAnniv === 0 ? '🎉' : daysUntilAnniv}
            </span>
            <span className="countdown__unit">
              {daysUntilAnniv === 0 ? '纪念日快乐 🎉' : '天后，是我们的纪念日'}
            </span>
          </div>
          <div className="countdown__line" />
        </>
      )}

      <p className="countdown__note" key={noteIdx}>
        「{isPrivateSpace ? profile.notes[noteIdx] : '每一天都算数。'}」
      </p>
    </div>
  )
}
