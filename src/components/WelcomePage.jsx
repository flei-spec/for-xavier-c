import { useState, useEffect } from 'react'
import { profile } from '../data/romanticProfile'
import { useAuth } from '../contexts/AuthContext'
import { getLatestMood, getWeeklyStats } from '../utils/moodHistory'
import { shanghaiTodayStr } from '../utils/relationshipTime'
import { fetchSeenFlags, saveSeenFlag } from '../lib/profiles'
import LocalAtmosphereCard from './LocalAtmosphereCard'
import AuthModal from './AuthModal'
import ReturningUserGreeting from './ReturningUserGreeting'
import WeeklyRecap from './WeeklyRecap'
import './WelcomePage.css'

// ── Weekly recap gate ─────────────────────────────────────────────────────────
// The recap auto-pops once per week: only on Monday, only if the user hasn't
// already seen it this week. localStorage persists the seen-state across
// refreshes and navigation without requiring a DB round-trip.
const RECAP_SEEN_KEY = 'xr_weekly_recap_week'

function getMondayId() {
  // Returns the YYYY-MM-DD of this week's Monday in Asia/Shanghai time.
  const todayStr = shanghaiTodayStr()              // "YYYY-MM-DD" already in Shanghai
  const [y, m, d] = todayStr.split('-').map(Number)
  const day  = new Date(y, m - 1, d).getDay()     // 0 = Sun, 1 = Mon, …
  const diff = day === 0 ? -6 : 1 - day
  const mon  = new Date(y, m - 1, d + diff)
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`
}

function isMonday() {
  const todayStr = shanghaiTodayStr()
  const [y, m, d] = todayStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay() === 1
}

function hasSeenThisWeeksRecap() {
  try { return localStorage.getItem(RECAP_SEEN_KEY) === getMondayId() } catch { return false }
}

function markWeeklyRecapSeen() {
  try { localStorage.setItem(RECAP_SEEN_KEY, getMondayId()) } catch {}
}

export default function WelcomePage({ onEnter, atmosphere }) {
  const { user, signOut } = useAuth()
  const [ready,    setReady]    = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  const [lastMood,         setLastMood]         = useState(null)
  const [greetingVisible,  setGreetingVisible]  = useState(false)
  const [showRecap,        setShowRecap]        = useState(false)
  const [hasWeeklyData,    setHasWeeklyData]    = useState(false)
  const [recapAutoEnter,   setRecapAutoEnter]   = useState(false)
  const [dbSeenWeek,       setDbSeenWeek]       = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Fetch latest mood, weekly stats, and DB seen flags in parallel
  useEffect(() => {
    if (!user) return
    getLatestMood(user.id).then(entry => {
      if (!entry) return
      const daysSince = (Date.now() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince <= 7) {
        setLastMood(entry.matched_mood)
        setGreetingVisible(true)
      }
    })
    getWeeklyStats(user.id).then(stats => {
      if (stats && stats.totalEntries >= 3) setHasWeeklyData(true)
    })
    // Fetch DB seen flag so cross-device seen state is respected
    fetchSeenFlags(user.id).then(flags => {
      setDbSeenWeek(flags.weekly_recap_week ?? null)
    })
  }, [user])

  const handleEnter = () => {
    // Seen if localStorage OR DB (other device) already recorded this week's recap
    const alreadySeen = hasSeenThisWeeksRecap() || dbSeenWeek === getMondayId()
    if (hasWeeklyData && isMonday() && !alreadySeen) {
      setRecapAutoEnter(true)
      setShowRecap(true)
    } else {
      onEnter()
    }
  }

  return (
    <div className={`welcome ${ready ? 'welcome--ready' : ''}`}>
      <div className="welcome__glow" />

      {/* ── Auth indicator — top right ── */}
      <div className="welcome__auth-bar">
        {user ? (
          <>
            <span className="welcome__auth-name">
              {user.email.split('@')[0]}
            </span>
            <button className="welcome__auth-action" onClick={signOut}>
              退出
            </button>
          </>
        ) : (
          <button
            className="welcome__auth-action welcome__auth-action--login"
            onClick={() => setShowAuth(true)}
          >
            登录 / 注册
          </button>
        )}
      </div>

      <div className="welcome__body">

        {/* ── Weather / time / location card ── */}
        <div className="welcome__atm">
          <LocalAtmosphereCard atmosphere={atmosphere} compact />
        </div>

        {/* ── Main title ── */}
        <div className="welcome__hero">
          <h1 className="welcome__title">
            <span className="welcome__for">For</span>
            <span className="welcome__name">{profile.fullName}</span>
          </h1>
        </div>

        {/* ── Returning user greeting ── */}
        {greetingVisible && lastMood && (
          <ReturningUserGreeting
            lastMood={lastMood}
            onDismiss={() => setGreetingVisible(false)}
          />
        )}

        {/* ── Supporting copy ── */}
        <div className="welcome__text">
          <p className="welcome__sub">为每日、想念、和你而存在。</p>
          <div className="welcome__dots"><span /><span /><span /></div>
          <p className="welcome__tagline">这是一个只为你打开的私人频率。</p>
        </div>

        {/* ── Call to action ── */}
        <div className="welcome__actions">
          <button className="welcome__cta" onClick={handleEnter}>
            开始今日的电台
          </button>
          {hasWeeklyData && (
            <button
              className="welcome__recap-hint"
              onClick={() => { setRecapAutoEnter(false); setShowRecap(true) }}
            >
              看看这周的心情 ✦
            </button>
          )}
          <p className="welcome__from">来自 {profile.fromName}，带着全部的心意 ♡</p>
        </div>

      </div>

      {showAuth && (
        <AuthModal onSuccess={() => setShowAuth(false)} />
      )}

      {showRecap && (
        <WeeklyRecap onClose={() => {
          markWeeklyRecapSeen()                                           // localStorage
          if (user) saveSeenFlag(user.id, { weekly_recap_week: getMondayId() })  // DB sync
          setDbSeenWeek(getMondayId())                                    // local state
          setShowRecap(false)
          if (recapAutoEnter) onEnter()
        }} />
      )}
    </div>
  )
}
