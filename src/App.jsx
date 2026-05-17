import { useState, useEffect, useCallback, useRef } from 'react'
import { moods } from './data/romanticProfile'
import { useAtmosphere } from './hooks/useAtmosphere'
import { useAuth } from './contexts/AuthContext'
import { getInterpolatedTheme } from './utils/timeGradient'
import StarBackground from './components/StarBackground'
import AtmosphereParticles from './components/AtmosphereParticles'
import AtmosphereGlow from './components/AtmosphereGlow'
import AuthLanding from './components/AuthLanding'
import WelcomePage from './components/WelcomePage'
import MoodSelector from './components/MoodSelector'
import RadioStation from './components/RadioStation'
import MiniPlayer from './components/MiniPlayer'
import { useAudioPlayer } from './contexts/AudioPlayerContext'
import { audioElement } from './audio/audioElement'
import { preloadSongLibrary } from './hooks/useSongLibrary'
import { fetchUnreadSecretLetters } from './utils/journal'
import WhisperNotification from './components/WhisperNotification'
import HiddenLoveLetter from './components/HiddenLoveLetter'
import MonthlyEmotionalLetter from './components/MonthlyEmotionalLetter'
import './App.css'

// ── Timezone-aware fractional hour ────────────────────────────────────────────
function getFractHour(tz) {
  const now = tz
    ? new Date(new Date().toLocaleString('en-US', { timeZone: tz }))
    : new Date()
  return now.getHours() + now.getMinutes() / 60
}

export default function App() {
  const { user, space, loadingAuth } = useAuth()
  const audioPlayer = useAudioPlayer()
  const [page, setPage]               = useState('welcome')
  const [selectedMood, setSelectedMood] = useState(null)
  const [guestMode, setGuestMode]       = useState(false)
  // Increments on every station entry so RadioStation fully remounts,
  // resetting all state and triggering a fresh random song pick.
  const [stationKey, setStationKey] = useState(0)
  const [isAiMatch, setIsAiMatch] = useState(false)
  const [whisperData,  setWhisperData]  = useState(null)  // { count } | null
  const [showLetterModal, setShowLetterModal] = useState(false)
  const [showMonthlyLetter, setShowMonthlyLetter] = useState(false)
  const [trackingOriginalInput, setTrackingOriginalInput] = useState(null)

  const { data: atmosphere } = useAtmosphere()

  // Fractional hour (e.g. 17.5 = 5:30 PM), updated every 60 seconds.
  // Initialized to local time; corrected to atmosphere timezone once it loads.
  const [fractHour, setFractHour] = useState(() => getFractHour(null))

  // Glow state passed to AtmosphereGlow component
  const [glowState, setGlowState] = useState(() => {
    const t = getInterpolatedTheme(getFractHour(null), null)
    return { glow1: t.glow1, glow2: t.glow2, skyGradient: t.skyGradient }
  })

  // When atmosphere loads, correct the fractional hour to the user's timezone
  useEffect(() => {
    if (!atmosphere?.timezone) return
    setFractHour(getFractHour(atmosphere.timezone))
  }, [atmosphere?.timezone])

  // 60-second timer — keeps fractHour current while the user stays on the page
  useEffect(() => {
    const tick = () => setFractHour(getFractHour(atmosphere?.timezone ?? null))
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [atmosphere?.timezone])

  // ── Apply interpolated theme whenever fractHour or weather changes ────────
  useEffect(() => {
    const weatherType = atmosphere?.weather?.type ?? null
    const atmTheme    = atmosphere?.theme ?? 'default'

    const theme = getInterpolatedTheme(fractHour, weatherType)

    // data-atm: drives rain/snow particles + subtle CSS overrides (deepnight etc)
    document.documentElement.setAttribute('data-atm',  atmTheme)
    // data-time: drives the full CSS token swap (day/sunset/night)
    document.documentElement.setAttribute('data-time', theme.dataTime)

    // --bg-deep: body background-color — CSS transitions this over 1.8s
    document.documentElement.style.setProperty('--bg-deep', theme.bgDeep)

    // Glow + sky gradient handled by <AtmosphereGlow> cross-fade
    setGlowState({ glow1: theme.glow1, glow2: theme.glow2, skyGradient: theme.skyGradient })

    return () => {
      document.documentElement.removeAttribute('data-atm')
      document.documentElement.removeAttribute('data-time')
      document.documentElement.style.removeProperty('--bg-deep')
    }
  }, [fractHour, atmosphere?.weather?.type, atmosphere?.theme])

  // When a guest logs in mid-session, exit guest mode
  useEffect(() => {
    if (user && guestMode) setGuestMode(false)
  }, [user, guestMode])

  // Dev: log auth state
  useEffect(() => {
    if (import.meta.env.DEV) console.log('[Auth]', user)
  }, [user])

  // ── Whisper notification: check unread letters once per session ────────
  useEffect(() => {
    if (!user) return
    const KEY = 'xr_whisper_notified'
    if (sessionStorage.getItem(KEY)) return

    const spaceId = space?.id ?? null
    fetchUnreadSecretLetters({ spaceId, userId: user.id }).then(letters => {
      if (letters && letters.length > 0) {
        sessionStorage.setItem(KEY, '1')
        setWhisperData({ count: letters.length })
      }
    })
  }, [user, space?.id])

  // ── Monthly letter: check for previous-month data once per month ──────
  useEffect(() => {
    if (!user) return
    const now = new Date()
    const MONTH_KEY = `xr_monthly_${now.getFullYear()}-${now.getMonth() + 1}`
    if (sessionStorage.getItem(MONTH_KEY)) return

    import('./utils/monthlyMoodAnalysis').then(({ getMonthlyStats }) => {
      getMonthlyStats(user.id).then(stats => {
        if (stats && stats.totalEntries > 0) {
          sessionStorage.setItem(MONTH_KEY, '1')
          setShowMonthlyLetter(true)
        }
      })
    })
  }, [user])

  // When user logs out, reset to welcome
  useEffect(() => {
    if (!user && !loadingAuth && !guestMode) {
      setPage('welcome')
      setSelectedMood(null)
    }
  }, [user, loadingAuth, guestMode])

  const handleEnter = () => {
    preloadSongLibrary()
    setPage('mood')
  }

  const handleStartStation = (mood, fromAi = false, originalInput = null) => {
    audioPlayer.clearStation()
    setIsAiMatch(fromAi)

    // Unlock WebAudio (Safari requires AudioContext in a user gesture)
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

    // Unlock HTML5 audio element (iOS Safari grants permission per-element)
    if (audioElement) audioElement.play().catch(() => {})

    setSelectedMood(mood)
    setStationKey(k => k + 1)
    localStorage.setItem('xavier_last_mood', mood.id)

    // Store tracking params for deferred logging in RadioStation
    // (mood is only logged after playback actually starts + 10s duration)
    setTrackingOriginalInput(originalInput)

    setPage('station')
  }

  const handleBack = () => setPage('mood')

  // Return to the last station from the MiniPlayer
  const handleReturnToStation = useCallback(() => {
    if (selectedMood) setPage('station')
  }, [selectedMood])

  const showMiniPlayer = !!audioPlayer.currentSong

  return (
    <div className={`app${showMiniPlayer ? ' app--has-miniplayer' : ''}`}>
      <StarBackground />
      {/* Continuous cross-fading glow + sky gradient overlay */}
      <AtmosphereGlow
        glow1={glowState.glow1}
        glow2={glowState.glow2}
        skyGradient={glowState.skyGradient}
      />
      <AtmosphereParticles theme={atmosphere?.theme} />

      {/* Persistent mini player — visible on all pages during playback */}
      {showMiniPlayer && (
        <MiniPlayer onReturnToStation={handleReturnToStation} />
      )}

      {loadingAuth ? null : !user && !guestMode ? (
        <AuthLanding onGuestMode={() => setGuestMode(true)} />
      ) : (
        <>
          {page === 'welcome' && (
            <WelcomePage onEnter={handleEnter} atmosphere={atmosphere} />
          )}
          {page === 'mood' && (
            <MoodSelector onStart={handleStartStation} onBack={() => setPage('welcome')} atmosphere={atmosphere} />
          )}
          {page === 'station' && selectedMood && (
            <RadioStation
              key={stationKey}
              mood={selectedMood}
              isAiMatch={isAiMatch}
              onBack={handleBack}
              atmosphere={atmosphere}
              trackingOriginalInput={trackingOriginalInput}
            />
          )}

          {/* ── Whisper notification ── */}
          {whisperData && (
            <WhisperNotification
              count={whisperData.count}
              onClick={() => { setWhisperData(null); setShowLetterModal(true) }}
              onDismiss={() => setWhisperData(null)}
            />
          )}

          {/* ── Direct letter modal (opened from whisper notification) ── */}
          {showLetterModal && (
            <HiddenLoveLetter onClose={() => setShowLetterModal(false)} />
          )}

          {/* ── Monthly emotional letter ── */}
          {showMonthlyLetter && (
            <MonthlyEmotionalLetter onClose={() => setShowMonthlyLetter(false)} />
          )}
        </>
      )}
    </div>
  )
}
