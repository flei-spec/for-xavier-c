import { useState, useEffect } from 'react'
import { moods } from './data/romanticProfile'
import { useAtmosphere } from './hooks/useAtmosphere'
import { useAuth } from './contexts/AuthContext'
import { getTimeOfDay, getBackgroundTheme } from './utils/backgroundTheme'
import StarBackground from './components/StarBackground'
import AtmosphereParticles from './components/AtmosphereParticles'
import AuthLanding from './components/AuthLanding'
import WelcomePage from './components/WelcomePage'
import MoodSelector from './components/MoodSelector'
import RadioStation from './components/RadioStation'
import './App.css'

export default function App() {
  const { user, loadingAuth } = useAuth()
  const [page, setPage]               = useState('welcome')
  const [selectedMood, setSelectedMood] = useState(null)
  const [guestMode, setGuestMode]       = useState(false)

  const { data: atmosphere } = useAtmosphere()

  // When a guest logs in mid-session, exit guest mode
  useEffect(() => {
    if (user && guestMode) setGuestMode(false)
  }, [user, guestMode])

  // When user logs out, reset to welcome so next login starts fresh
  useEffect(() => {
    if (!user && !loadingAuth && !guestMode) {
      setPage('welcome')
      setSelectedMood(null)
    }
  }, [user, loadingAuth, guestMode])

  // ── Apply atmosphere theme ─────────────────────────────────────────────────
  useEffect(() => {
    const theme = atmosphere?.theme ?? 'default'
    document.documentElement.setAttribute('data-atm', theme)

    const hour        = atmosphere?.hour        ?? new Date().getHours()
    const weatherType = atmosphere?.weather?.type ?? null

    const timeOfDay = getTimeOfDay(hour)
    const bg        = getBackgroundTheme({ timeOfDay, weather: weatherType })

    const root = document.documentElement.style
    root.setProperty('--bg-deep',    bg.bgDeep)
    root.setProperty('--atm-glow-1', bg.glow1)
    root.setProperty('--atm-glow-2', bg.glow2)

    return () => {
      document.documentElement.removeAttribute('data-atm')
      root.removeProperty('--bg-deep')
      root.removeProperty('--atm-glow-1')
      root.removeProperty('--atm-glow-2')
    }
  }, [atmosphere?.theme, atmosphere?.hour, atmosphere?.weather?.type])

  const handleEnter = () => setPage('mood')

  const handleStartStation = (mood) => {
    // ── Unlock audio policy synchronously during the user gesture ──────────────
    //
    // Two separate unlocks are needed because iOS Safari treats WebAudio and
    // HTML5 <audio> elements independently:
    //
    // 1. WebAudio (AudioContext) unlock — lets VoiceIntroPlayer and any
    //    AudioContext-based code play without user gesture after this point.
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        const buf = ctx.createBuffer(1, 1, 22050)
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.connect(ctx.destination)
        src.start(0)
        ctx.close()
      }
    } catch (_) {}

    // 2. HTML5 <audio> unlock — iOS Safari requires play() to be called on a
    //    real <audio> element during a user gesture to allow subsequent
    //    audio.play() calls from effects/timers on the same page session.
    //    A 0-sample silent WAV plays and ends instantly; its only purpose is
    //    to satisfy Safari's "first play must be in gesture" requirement.
    try {
      const sil = new Audio(
        'data:audio/wav;base64,' +
        'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
      )
      sil.play().catch(() => {})
    } catch (_) {}

    setSelectedMood(mood)
    localStorage.setItem('xavier_last_mood', mood.id)
    setPage('station')
  }

  const handleBack = () => setPage('mood')

  return (
    <div className="app">
      <StarBackground />
      <AtmosphereParticles theme={atmosphere?.theme} />

      {/* ── Auth gate ── */}
      {loadingAuth ? (
        // Brief loading state while Supabase resolves the session
        null
      ) : !user && !guestMode ? (
        // Not logged in and not in guest mode → show landing page
        <AuthLanding onGuestMode={() => setGuestMode(true)} />
      ) : (
        // Logged in or guest mode → normal app flow
        <>
          {page === 'welcome' && (
            <WelcomePage onEnter={handleEnter} atmosphere={atmosphere} />
          )}
          {page === 'mood' && (
            <MoodSelector onStart={handleStartStation} onBack={() => setPage('welcome')} atmosphere={atmosphere} />
          )}
          {page === 'station' && selectedMood && (
            <RadioStation
              mood={selectedMood}
              onBack={handleBack}
              atmosphere={atmosphere}
            />
          )}
        </>
      )}
    </div>
  )
}
