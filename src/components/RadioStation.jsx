import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import RadioPlayer from './RadioPlayer'
import SongList from './SongList'
import AnniversaryCountdown from './AnniversaryCountdown'
import DistanceCard from './DistanceCard'
import MeetingCountdown from './MeetingCountdown'
import HeartUnlock from './HeartUnlock'
import MemoryDiary from './MemoryDiary'
import HiddenLoveLetter from './HiddenLoveLetter'
import LocalPlaylist from './LocalPlaylist'
import LocalAtmosphereCard from './LocalAtmosphereCard'
import AIRadioLine from './AIRadioLine'
import AuthModal from './AuthModal'
import SpaceGate from './SpaceGate'
import DiaryRecords from './DiaryRecords'
import VoiceMailbox from './VoiceMailbox'
import { useAuth } from '../contexts/AuthContext'
import { useAudioPlayer } from '../contexts/AudioPlayerContext'
import { useSongLibrary } from '../hooks/useSongLibrary'
import { fetchUnreadLetterCount } from '../utils/journal'
import { logMoodEvent } from '../utils/moodHistory'
import { moodVoiceMap } from '../data/moodVoiceMap'
import { shanghaiHour } from '../utils/relationshipTime'
import { devValidateSongs } from '../data/songConfig'
import { LONG_STAY } from '../utils/atmosphere'
import { audioElement } from '../audio/audioElement'
import { PRIVATE_SPACE_ID, INTRO_AUTH_UID } from '../config/spaces'
import './RadioStation.css'

// ── song matching ─────────────────────────────────────────────────────────────

const FALLBACK_TAGS = ['思念', '孤独', '治愈']

function pickRandomStartIndex(moodId, songs) {
  if (songs.length <= 1) return 0
  const key = `xr_last_${moodId}`
  const lastSrc = sessionStorage.getItem(key)
  let candidates = songs.map((_, i) => i)
  if (lastSrc) {
    const lastIdx = songs.findIndex(s => s.src === lastSrc)
    if (lastIdx !== -1) candidates = candidates.filter(i => i !== lastIdx)
  }
  const idx = candidates[Math.floor(Math.random() * candidates.length)]
  try { sessionStorage.setItem(key, songs[idx].src) } catch (_) {}
  console.log('[RadioStation] Selected random song for mood:', moodId, songs[idx]?.title)
  return idx
}

function seededShuffle(songs) {
  const arr = [...songs]
  const seed = new Date().toDateString()
    .split('').reduce((n, c) => (n * 31 + c.charCodeAt(0)) | 0, 7)
  let s = seed
  for (let i = arr.length - 1; i > 0; i--) {
    s = ((s * 1664525) + 1013904223) | 0
    const j = Math.abs(s) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function filterMoodSongs(library, moodLabel) {
  console.log('[RadioStation] Library size:', library.length)
  console.log('[RadioStation] Selected mood:', moodLabel)
  let matched = library.filter(s => s.moodTags.includes(moodLabel))
  console.log('[RadioStation] Songs matching mood:', matched.length)
  if (matched.length === 0) {
    matched = library.filter(s => FALLBACK_TAGS.some(t => s.moodTags.includes(t)))
    console.warn(`[RadioStation] No songs for "${moodLabel}" — using fallback pool (${matched.length})`)
  }
  const shuffled = seededShuffle(matched)
  console.log('[RadioStation] Valid playable songs (pre-filter):', shuffled.length)
  return shuffled
}

// ── VoiceIntroPlayer ──────────────────────────────────────────────────────────

function VoiceIntroPlayer({ src, onEnded }) {
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) { onEnded(); return }

    let active = true

    audio.volume = 0.96
    audio.src = src
    audio.load()

    audio.play()
      .then(() => { if (!active) return })
      .catch(err => {
        if (!active || err.name === 'AbortError') return
        onEnded()
      })

    return () => {
      active = false
      audio.pause()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  return (
    <audio
      ref={audioRef}
      onEnded={onEnded}
      onError={onEnded}
      preload="auto"
      style={{ display: 'none' }}
    />
  )
}

// ── VoiceIntroBanner ──────────────────────────────────────────────────────────

function VoiceIntroBanner({ phase, accentColor }) {
  return (
    <div className={`vb vb--${phase}`} style={{ '--vb-accent': accentColor }}>
      {phase === 'playing' ? (
        <>
          <span className="vb__mic">🎙️</span>
          <div className="vb__waves">
            {[0,1,2,3,4,5,6].map(i => (
              <div key={i} className="vb__bar" style={{ '--i': i }} />
            ))}
          </div>
          <span className="vb__text">Xavier.C 的语音电台开场中…</span>
        </>
      ) : (
        <>
          <span className="vb__mic">✨</span>
          <span className="vb__text vb__text--ready">正在为你播放专属歌单</span>
        </>
      )}
    </div>
  )
}

// ── Long-stay toast ───────────────────────────────────────────────────────────

function LongStayToast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="ls-toast" role="status">
      <span className="ls-toast__icon">💌</span>
      <span className="ls-toast__text">{message}</span>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

// PRIVATE_SPACE_ID and INTRO_AUTH_UID imported from src/config/spaces.js

export default function RadioStation({ mood, onBack, atmosphere, isAiMatch, playbackSource = 'moodCard', trackingOriginalInput = null }) {
  const { user, space, loadingAuth, loadingSpace, refreshSpace, signOut } = useAuth()
  const { library, loading: libLoading } = useSongLibrary()
  const audioPlayer = useAudioPlayer()

  // ── Intro authorization — single source of truth, evaluated before hooks ──
  // Both isAiMatch and playbackSource must agree: if either signals AI/non-card,
  // skip the intro. This is computed as a plain const (not inside a lazy
  // initializer) so it can never be re-evaluated with stale closure values.
  const introAllowed =
    user?.id === INTRO_AUTH_UID &&
    !isAiMatch &&
    playbackSource === 'moodCard' &&
    !!(moodVoiceMap?.[mood.id])

  // ── Song data ─────────────────────────────────────────────────────────────
  const initialIndexMoodRef = useRef(null)
  const moodSongs = useMemo(() => filterMoodSongs(library, mood.id), [library, mood.id])

  const [runtimeInvalidSrcs, setRuntimeInvalidSrcs] = useState(() => new Set())

  const songs = useMemo(() => {
    if (!runtimeInvalidSrcs.size) return moodSongs
    const filtered = moodSongs.filter(s => !runtimeInvalidSrcs.has(s.src))
    console.warn('[RadioStation] Invalid songs removed from queue:', [...runtimeInvalidSrcs])
    return filtered
  }, [moodSongs, runtimeInvalidSrcs])

  // ── UI states ─────────────────────────────────────────────────────────────
  const [heartBeat,        setHeartBeat]        = useState(false)
  const [showUnlock,  setShowUnlock]  = useState(false)
  const [privateView, setPrivateView] = useState(null) // 'letter' | 'diary' | 'records' | 'voice' | 'space'
  const [djVisible,        setDjVisible]         = useState(false)
  const [introPhase,       setIntroPhase]        = useState(introAllowed ? 'playing' : 'ready')
  const [showBanner,  setShowBanner]  = useState(introAllowed)
  const [longStayMsg, setLongStayMsg] = useState(null)
  const [songError,   setSongError]   = useState(null)

  const [unreadLetterCount, setUnreadLetterCount] = useState(0)
  const [showAuthModal,  setShowAuthModal]  = useState(false)
  const [showSpaceGate,  setShowSpaceGate]  = useState(false)
  const [pendingAction,  setPendingAction]  = useState(null)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const heartBeatRef    = useRef(null)
  const readyTimerRef   = useRef(null)
  const skipTimerRef    = useRef(null)
  const stayStartRef    = useRef(Date.now())
  const shownStayRef    = useRef(new Set())
  const stayIntervalRef = useRef(null)
  // Stable ref so songs effect can read introPhase without it as a dep
  const introPhaseRef   = useRef(introPhase)
  useEffect(() => { introPhaseRef.current = introPhase }, [introPhase])

  // ── Mount-time trace ──────────────────────────────────────────────────────
  useEffect(() => {
    console.log('[VoiceIntro] introAllowed:', introAllowed, '| source:', playbackSource, '| isAiMatch:', isAiMatch, '| uid:', user?.id?.slice(0, 8) + '…')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fetch unread secret-letter count when HeartUnlock opens or a private
  // view closes (so the dot refreshes after the user has read a letter) ────────
  useEffect(() => {
    if (!showUnlock || !user || space?.id !== PRIVATE_SPACE_ID) return
    if (privateView !== null) return  // a view is open — wait until it closes
    fetchUnreadLetterCount({ spaceId: space.id, userId: user.id }).then(setUnreadLetterCount)
  }, [showUnlock, user?.id, space?.id, privateView])

  // ── Deferred mood tracking ────────────────────────────────────────────────
  // Only log a mood event after playback actually starts AND lasts ≥ 10 seconds.
  // Guards: skips hot-reload mounts, enforces 10-min cooldown per mood, cancels
  // on unmount or mood change.
  const wasPlayingOnMount = useRef(audioPlayer.isPlaying)
  const hasTrackedForSession = useRef(false)
  const trackingTimer = useRef(null)
  const isPlayingRef = useRef(audioPlayer.isPlaying)
  useEffect(() => { isPlayingRef.current = audioPlayer.isPlaying }, [audioPlayer.isPlaying])

  useEffect(() => {
    if (!audioPlayer.isPlaying || introPhase !== 'ready') return
    if (wasPlayingOnMount.current) return
    if (hasTrackedForSession.current) return
    if (!user) return

    hasTrackedForSession.current = true

    trackingTimer.current = setTimeout(() => {
      if (!isPlayingRef.current) {
        console.log('[RadioStation] mood tracking skipped — playback stopped before 10s')
        return
      }

      const MOOD_KEY = `xr_mood_tracked_${mood.id}`
      const lastTracked = sessionStorage.getItem(MOOD_KEY)
      const COOLDOWN_MS = 10 * 60 * 1000
      if (lastTracked) {
        const elapsed = Date.now() - parseInt(lastTracked, 10)
        if (elapsed < COOLDOWN_MS) {
          console.log('[RadioStation] mood tracking skipped — cooldown active for:', mood.id)
          return
        }
      }

      const source = isAiMatch ? 'custom_input' : 'mood_card'
      logMoodEvent({
        userId: user.id,
        spaceId: space?.id ?? null,
        source,
        originalInput: trackingOriginalInput,
        matchedMood: mood.id,
        currentTrackTitle: audioPlayer.currentSong?.title || null,
      }).catch(err => console.warn('[RadioStation] moodHistory log:', err?.message))

      sessionStorage.setItem(MOOD_KEY, String(Date.now()))
      console.log('[RadioStation] mood tracked:', mood.id, '| source:', source)
    }, 10000)

    return () => {
      if (trackingTimer.current) {
        clearTimeout(trackingTimer.current)
        trackingTimer.current = null
      }
    }
  }, [audioPlayer.isPlaying, introPhase, mood.id, user?.id])

  const voiceSrc = moodVoiceMap[mood.id]

  // ── Auth-gate pending action ──────────────────────────────────────────────
  useEffect(() => {
    if (!pendingAction) return
    if (loadingAuth) return
    if (!user) { setShowAuthModal(true); return }

    if (pendingAction === 'letter') { setPendingAction(null); setPrivateView('letter'); return }
    if (pendingAction === 'space')  { setPendingAction(null); setPrivateView('space'); return }
    if (pendingAction === 'voice')  { setPendingAction(null); setPrivateView('voice'); return }

    if (pendingAction === 'diary' || pendingAction === 'records') {
      if (loadingSpace) return
      if (!space) { setPrivateView('space'); return }
      const action = pendingAction
      setPendingAction(null)
      setPrivateView(action === 'diary' ? 'diary' : 'records')
    }
  }, [user, space, loadingAuth, loadingSpace, pendingAction])

  // ── Dev validation ────────────────────────────────────────────────────────
  useEffect(() => { devValidateSongs(moodSongs) }, [mood.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load playlist into context when songs are ready ───────────────────────
  useEffect(() => {
    if (songs.length === 0) return
    if (initialIndexMoodRef.current === mood.id) return
    initialIndexMoodRef.current = mood.id
    const idx      = pickRandomStartIndex(mood.id, songs)
    const autoplay = introPhaseRef.current !== 'playing'
    audioPlayer.loadPlaylist(songs, mood, idx, autoplay, isAiMatch)
  // songs changes when library loads or runtimeInvalidSrcs changes.
  // audioPlayer/mood are stable within a remount cycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, mood.id])

  // ── Error callback registration ───────────────────────────────────────────
  useEffect(() => {
    audioPlayer.setErrorCallback((msg, failedSrc) => {
      if (failedSrc) {
        console.warn('[RadioStation] song error, marking invalid:', failedSrc)
        setRuntimeInvalidSrcs(prev => new Set([...prev, failedSrc]))
      }
      setSongError(msg)
      clearTimeout(skipTimerRef.current)
      skipTimerRef.current = setTimeout(() => {
        setSongError(null)
        audioPlayer.nextSong()
      }, 800)
    })
    return () => audioPlayer.setErrorCallback(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sync context playlist when songs are filtered after an error ──────────
  useEffect(() => {
    if (!runtimeInvalidSrcs.size || songs.length === 0) return
    const safeIdx = Math.max(0, Math.min(audioPlayer.songIndex, songs.length - 1))
    audioPlayer.updatePlaylist(songs, safeIdx)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeInvalidSrcs])

  // ── Mood change: reset UI state ───────────────────────────────────────────
  useEffect(() => {
    console.log('[RadioStation] Mood selected:', mood.id)
    setSongError(null)
    setRuntimeInvalidSrcs(new Set())
    setDjVisible(false)
    clearTimeout(readyTimerRef.current)
    clearTimeout(skipTimerRef.current)
    const t = setTimeout(() => setDjVisible(true), 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood.id])

  // ── Long-stay messages ────────────────────────────────────────────────────
  useEffect(() => {
    stayStartRef.current = Date.now()
    shownStayRef.current.clear()

    stayIntervalRef.current = setInterval(() => {
      const elapsedMin = (Date.now() - stayStartRef.current) / 60_000
      const next = LONG_STAY.find(
        e => elapsedMin >= e.minutes && !shownStayRef.current.has(e.minutes)
      )
      if (next) {
        shownStayRef.current.add(next.minutes)
        setLongStayMsg(next.msg)
      }
    }, 30_000)

    return () => clearInterval(stayIntervalRef.current)
  }, [mood.id])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleIntroEnded = useCallback(() => {
    console.log('[RadioStation] Voice intro ended → playlist playback starting')
    setIntroPhase('ready')
    readyTimerRef.current = setTimeout(() => setShowBanner(false), 2500)
    // RadioPlayer's introPhase effect calls audioPlayer.startAfterIntro()
  }, [])

  const handleTapToStart = useCallback(() => {
    if (audioElement) audioElement.play().catch(() => {})
    audioPlayer.tapToPlay()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleHeartClick = () => {
    setHeartBeat(true)
    clearTimeout(heartBeatRef.current)
    heartBeatRef.current = setTimeout(() => setHeartBeat(false), 600)
    setShowUnlock(true)
  }

  const handleLetterFromUnlock = () => {
    if (!user) { setPendingAction('letter'); setShowAuthModal(true); return }
    setPrivateView('letter')
  }

  const handleDiaryFromUnlock = async () => {
    if (!user) { setPendingAction('diary'); setShowAuthModal(true); return }
    const freshSpace = await refreshSpace()
    if (!freshSpace) { setPrivateView('space'); return }
    setPrivateView('diary')
  }

  const handleSpaceFromUnlock = () => {
    if (!user) { setPendingAction('space'); setShowAuthModal(true); return }
    setPrivateView('space')
  }

  const handleRecordsFromUnlock = async () => {
    if (!user) { setPendingAction('records'); setShowAuthModal(true); return }
    const freshSpace = await refreshSpace()
    if (!freshSpace) { setPrivateView('space'); return }
    setPrivateView('records')
  }

  const handleVoiceFromUnlock = () => {
    if (!user) { setPendingAction('voice'); setShowAuthModal(true); return }
    setPrivateView('voice')
  }

  const handleBackToMenu  = () => setPrivateView(null)
  const handleCloseAll    = () => { setPrivateView(null); setShowUnlock(false) }

  // ── Derived display values ────────────────────────────────────────────────

  const showDjCard  = user != null && space?.id === PRIVATE_SPACE_ID
  const djTimeLabel = shanghaiHour() < 18 ? '今天的话' : '今晚的话'

  // Show RadioPlayer only once the context has loaded this mood's playlist.
  // Prevents mounting RadioPlayer before the random song is determined.
  const showPlayer  = audioPlayer.currentSong !== null && audioPlayer.currentMood?.id === mood.id
  const currentSong = showPlayer ? audioPlayer.currentSong : null

  console.log('DISPLAY SONG:', currentSong?.title, currentSong?.src)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="station">

      {/* hidden intro audio — double-gated: introAllowed AND introPhase */}
      {introAllowed && introPhase === 'playing' && voiceSrc && (
        <VoiceIntroPlayer key={mood.id} src={voiceSrc} onEnded={handleIntroEnded} />
      )}

      {/* long-stay toast */}
      {longStayMsg && (
        <LongStayToast message={longStayMsg} onDismiss={() => setLongStayMsg(null)} />
      )}

      {/* ── header ── */}
      <header className="station__header">
        <button className="station__back" onClick={onBack}>← 换个心情</button>

        <div className="station__title">
          <span className="station__live-dot" />
          <span>Xavier.C 电台</span>
          <span
            className="station__badge"
            style={{
              color:       mood.accentColor,
              borderColor: `${mood.accentColor}55`,
              background:  `${mood.accentColor}12`,
            }}
          >
            {isAiMatch ? '✦ 你的专属情绪' : `${mood.icon} ${mood.label}`}
          </span>
        </div>

        <button
          className={`station__heart ${heartBeat ? 'station__heart--beat' : ''}`}
          onClick={handleHeartClick}
          title="💌"
        >
          🤍
        </button>
      </header>

      {/* ── content ── */}
      <main className="station__content">

        <LocalAtmosphereCard atmosphere={atmosphere} />

        {djVisible && showDjCard && (
          <div className="station__dj">
            <div className="station__dj-avatar">🎙️</div>
            <div className="station__dj-bubble">
              <p className="station__dj-label">{djTimeLabel}</p>
              <p className="station__dj-text">「{mood.djIntro}」</p>
            </div>
          </div>
        )}

        {showBanner && introAllowed && (
          <VoiceIntroBanner phase={introPhase} accentColor={mood.accentColor} />
        )}

        <AIRadioLine mood={mood} />

        {songError && (
          <p style={{ color: '#f88', textAlign: 'center', fontSize: '0.85rem', margin: '0.5rem 0' }}>
            ⚠️ 歌曲加载失败：{songError}
          </p>
        )}

        {showPlayer && <RadioPlayer mood={mood} introPhase={introPhase} />}

        <SongList
          songs={songs}
          currentIndex={audioPlayer.songIndex}
          onSelect={audioPlayer.selectSong}
          accentColor={mood.accentColor}
          allSongs={library}
          libraryLoading={libLoading}
        />

        <div className="station__cards">
          <AnniversaryCountdown />
          <DistanceCard />
          <MeetingCountdown />
        </div>

        <p className="station__hint">轻点那个 🤍，有个秘密在等你。</p>

        <LocalPlaylist />
      </main>

      {showUnlock && (
        <HeartUnlock
          onClose={() => { setShowUnlock(false); setUnreadLetterCount(0) }}
          onLetter={handleLetterFromUnlock}
          onDiary={handleDiaryFromUnlock}
          onSpace={handleSpaceFromUnlock}
          onRecords={handleRecordsFromUnlock}
          onVoice={handleVoiceFromUnlock}
          onLogout={user ? () => { setShowUnlock(false); signOut() } : undefined}
          isPrivateSpace={space?.id === PRIVATE_SPACE_ID}
          unreadLetterCount={unreadLetterCount}
        />
      )}

      {privateView === 'letter' && (
        <HiddenLoveLetter onClose={handleBackToMenu} onCloseAll={handleCloseAll} />
      )}

      {privateView === 'diary' && (
        <MemoryDiary
          onClose={handleBackToMenu}
          onCloseAll={handleCloseAll}
          mood={mood}
          currentSong={currentSong}
        />
      )}

      {showAuthModal && <AuthModal onSuccess={() => setShowAuthModal(false)} />}
      {privateView === 'space' && (
        <SpaceGate onSuccess={handleBackToMenu} onCloseAll={handleCloseAll} />
      )}
      {privateView === 'records' && (
        <DiaryRecords onClose={handleBackToMenu} onCloseAll={handleCloseAll} />
      )}
      {privateView === 'voice' && (
        <VoiceMailbox onClose={handleBackToMenu} onCloseAll={handleCloseAll} />
      )}

      {/* Tap-to-enter overlay — browser blocked autoplay */}
      {audioPlayer.autoplayBlocked && (
        <div
          className="station__tap-overlay"
          onClick={handleTapToStart}
          role="button"
          aria-label="轻触开始播放"
        >
          <div className="station__tap-inner">
            <span className="station__tap-icon" style={{ color: mood.accentColor }}>♫</span>
            <p className="station__tap-text">轻触，开始今晚的电台</p>
            <p className="station__tap-hint" style={{ color: `${mood.accentColor}99` }}>
              {mood.icon} {mood.label}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
