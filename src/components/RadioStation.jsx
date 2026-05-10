import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import RadioPlayer from './RadioPlayer'
import SongList from './SongList'
import AnniversaryCountdown from './AnniversaryCountdown'
import MeetingCountdown from './MeetingCountdown'
import HeartUnlock from './HeartUnlock'
import MemoryDiary from './MemoryDiary'
import HiddenLoveLetter from './HiddenLoveLetter'
import LocalPlaylist from './LocalPlaylist'
import LocalAtmosphereCard from './LocalAtmosphereCard'
import CompanionLine from './CompanionLine'
import AuthModal from './AuthModal'
import SpaceGate from './SpaceGate'
import DiaryRecords from './DiaryRecords'
import VoiceMailbox from './VoiceMailbox'
import { useAuth } from '../contexts/AuthContext'
import { songMoodMap } from '../data/songMoodMap'
import { moodVoiceMap } from '../data/moodVoiceMap'
import { resolveSongUrl, devValidateSongs } from '../data/songConfig'
import { LONG_STAY } from '../utils/atmosphere'
import './RadioStation.css'

// ── song matching ─────────────────────────────────────────────────────────────

const FALLBACK_TAGS = ['需要安慰', '想被抱抱', '想一个人发呆']

// Deterministic daily shuffle — same order within a day, fresh each day.
// Uses a seeded LCG so the radio feels "curated" rather than truly random.
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

function getStationSongs(moodLabel) {
  console.log('[RadioStation] All songs in map:', songMoodMap.length)
  console.log('[RadioStation] Selected mood:', moodLabel)

  let matched = songMoodMap.filter(s => s.moodTags.includes(moodLabel))
  console.log('[RadioStation] Songs matching mood:', matched.length)

  if (matched.length === 0) {
    // Fallback: use soft emotional moods so the player is never empty
    matched = songMoodMap.filter(s =>
      FALLBACK_TAGS.some(t => s.moodTags.includes(t))
    )
    console.warn(`[RadioStation] No songs for "${moodLabel}" — using fallback pool (${matched.length})`)
  }

  // Resolve CDN URLs (no-op when CDN_BASE is empty).
  // NOTE: src is mutated to the full URL here — useSongValidator must NOT
  // call resolveSongUrl() again or it will double-prepend the CDN base.
  const resolved = matched.map(s => ({ ...s, src: resolveSongUrl(s.src) }))

  const shuffled = seededShuffle(resolved)
  console.log('[RadioStation] Valid playable songs (pre-filter):', shuffled.length)
  return shuffled
}

// ── VoiceIntroPlayer ──────────────────────────────────────────────────────────
//
// Two bugs killed the original implementation in React 18 Strict Mode (dev):
//
//  1. Strict Mode runs every effect twice: effect → cleanup → effect again.
//     The cleanup called audio.pause() + removeAttribute('src'), which caused
//     the pending play() Promise to reject with AbortError.  The catch handler
//     treated AbortError as a real failure and called onEnded(), skipping the
//     intro entirely before a note had played.
//
//  2. The cleanup removed the src attribute.  The second effect invocation
//     then called audio.load() + audio.play() on a src-less element, which
//     always fails (MediaError code 4 — SRC_NOT_SUPPORTED).
//
// Fix: use an `active` closure flag.
//  • On cleanup: pause but keep src intact; mark `active = false`.
//  • On AbortError / any rejection while !active: ignore silently (the next
//    effect run will resume playback from the same position).
//  • Only call onEnded() when truly failed AND the effect is still current.

function VoiceIntroPlayer({ src, onEnded }) {
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      console.log('[VoiceIntro] No intro found, starting playlist (no audio ref)')
      onEnded()
      return
    }

    let active = true  // false after cleanup; guards against Strict Mode false-errors

    console.log(`[VoiceIntro] Playing voice intro for mood: ${src}`)

    audio.volume = 0.96
    audio.src = src   // set src imperatively so we can control reload timing
    audio.load()      // reset + start fetching

    audio.play()
      .then(() => {
        if (!active) return
        console.log('[VoiceIntro] ▶ Audio playing:', src)
      })
      .catch(err => {
        // AbortError = play() was interrupted by cleanup's pause().
        // This is harmless in Strict Mode: the next effect run will resume.
        if (!active || err.name === 'AbortError') return
        console.log(`[VoiceIntro] No intro found, starting playlist (${err.name}: ${err.message})`)
        onEnded()
      })

    return () => {
      active = false
      audio.pause()
      // IMPORTANT: do NOT removeAttribute('src') here.
      // Keeping src intact lets the second Strict Mode effect run resume the
      // same audio from where it paused, without a full reload cycle.
    }
  // `onEnded` is stable (wrapped in useCallback with []).
  // `src` only changes when a new mood is selected (component remounts via key).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  return (
    <audio
      ref={audioRef}
      onEnded={() => {
        console.log('[VoiceIntro] Voice intro ended, starting playlist')
        onEnded()
      }}
      onError={e => {
        const code = e.target.error?.code
        const msg  = e.target.error?.message ?? 'unknown'
        console.log(`[VoiceIntro] No intro found, starting playlist (MediaError ${code}: ${msg})`)
        onEnded()
      }}
      // preload=auto so the file is buffered while the DJ card animates in
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

// Only this account hears the voice intro.
const INTRO_AUTH_UID = '3f370ae9-a462-4a17-b2f4-5a05d4958c76'

// Only this couple space sees the personal mood message card.
const PRIVATE_SPACE_ID = '89f07d46-af87-4aea-b7e8-e4a804cb21d1'

export default function RadioStation({ mood, onBack, atmosphere }) {
  const { user, space, loadingAuth, loadingSpace, refreshSpace, signOut } = useAuth()

  // Must be computed before lazy useState so the initializers can read it.
  const isIntroAuthorized = user?.id === INTRO_AUTH_UID

  const [songIndex, setSongIndex]   = useState(0)
  const [heartBeat, setHeartBeat]   = useState(false)
  const [showUnlock,       setShowUnlock]       = useState(false)
  const [showLetter,       setShowLetter]       = useState(false)
  const [showDiary,        setShowDiary]        = useState(false)
  const [showRecords,      setShowRecords]      = useState(false)
  const [showVoiceMailbox, setShowVoiceMailbox] = useState(false)
  const [djVisible, setDjVisible]   = useState(false)
  // Lazy-initialize — intro only plays for the authorized user.
  const [introPhase, setIntroPhase] = useState(() =>
    isIntroAuthorized && !!moodVoiceMap[mood.id] ? 'playing' : 'ready'
  )
  const [showBanner, setShowBanner] = useState(() =>
    isIntroAuthorized && !!moodVoiceMap[mood.id]
  )
  const [longStayMsg, setLongStayMsg] = useState(null)
  const [songError, setSongError]   = useState(null)

  // Auth gate — 'letter' | 'diary' | 'space' | 'records' | null
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showSpaceGate, setShowSpaceGate] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  // Single effect that executes a pending action once auth + space have settled.
  // Handlers only ever call setPendingAction() — they never check user/space
  // directly, because those may still be loading on first page render.
  useEffect(() => {
    if (!pendingAction) return

    console.log('[RadioStation] pendingAction effect:', pendingAction,
      '| loadingAuth:', loadingAuth,
      '| user:', user?.id ?? 'none',
      '| loadingSpace:', loadingSpace,
      '| space:', space?.id ?? 'none')

    // Wait until Supabase has resolved the initial session
    if (loadingAuth) return

    // Auth settled — no user means we need login
    if (!user) {
      console.log('[RadioStation] → no user, showing AuthModal')
      setShowAuthModal(true)
      return
    }

    // User is logged in — handle each action type
    if (pendingAction === 'letter') {
      setPendingAction(null); setShowLetter(true); return
    }
    if (pendingAction === 'space') {
      setPendingAction(null); setShowSpaceGate(true); return
    }
    if (pendingAction === 'voice') {
      // voice mailbox only needs auth, no space required
      setPendingAction(null); setShowVoiceMailbox(true); return
    }

    // Space-gated actions: diary and records
    if (pendingAction === 'diary' || pendingAction === 'records') {
      // Wait until the get_my_space RPC has returned
      if (loadingSpace) return

      if (!space) {
        console.log('[RadioStation] → no space, showing SpaceGate')
        setShowSpaceGate(true)
        return
      }

      const action = pendingAction   // capture before clearing
      console.log('[RadioStation] → opening', action, '| space:', space.id)
      setPendingAction(null)
      if (action === 'diary') setShowDiary(true)
      else                    setShowRecords(true)
    }
  }, [user, space, loadingAuth, loadingSpace, pendingAction])

  const heartBeatRef    = useRef(null)
  const readyTimerRef   = useRef(null)
  const skipTimerRef    = useRef(null)
  const stayStartRef    = useRef(Date.now())
  const shownStayRef    = useRef(new Set())
  const stayIntervalRef = useRef(null)

  // Stable reference — only recomputed when mood.id changes
  const allSongs = useMemo(() => getStationSongs(mood.id), [mood.id])
  const voiceSrc = moodVoiceMap[mood.id]

  // Runtime failures (caught by the audio element during playback).
  // R2's CORS policy allows GET but not HEAD, so pre-flight HEAD validation
  // is not possible from the browser — all HEAD fetch() calls would fail with
  // CORS errors and remove every song from the queue.
  // Instead, broken songs are discovered naturally during playback: the audio
  // element's onError fires, handleSongError marks the src here, and the song
  // is permanently skipped on all future loops in this session.
  const [runtimeInvalidSrcs, setRuntimeInvalidSrcs] = useState(() => new Set())

  // Filter only songs that have already failed at runtime (safe — no CORS issue)
  const songs = useMemo(() => {
    if (!runtimeInvalidSrcs.size) return allSongs
    const filtered = allSongs.filter(s => !runtimeInvalidSrcs.has(s.src))
    console.warn('[RadioStation] Invalid songs (removed from queue):', [...runtimeInvalidSrcs])
    console.log('[RadioStation] Valid playable songs (post-filter):', filtered.length)
    return filtered
  }, [allSongs, runtimeInvalidSrcs])

  // Dev-only: fire HEAD requests once to catch missing CDN files early
  useEffect(() => { devValidateSongs(allSongs) }, [mood.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mood message card visibility ─────────────────────────────────────────
  const showDjCard  = user != null && space?.id === PRIVATE_SPACE_ID
  const djTimeLabel = new Date().getHours() < 18 ? '今天的话' : '今晚的话'

  console.log('[RadioStation] user id:', user?.id ?? 'none')
  console.log('[RadioStation] currentSpace id:', space?.id ?? 'none')
  console.log('[RadioStation] mood message visible:', showDjCard, '| time label:', djTimeLabel)

  // Mood change: reset playback state and kick off the DJ card animation.
  // introPhase and showBanner are lazy-initialized above so they're already
  // correct on the first render — this effect only matters if mood.id somehow
  // changes without a full component remount.
  useEffect(() => {
    console.log('[RadioStation] Mood selected:', mood.id)
    console.log('[RadioStation] Auth user id:', user?.id ?? 'none (guest)')
    console.log('[RadioStation] Intro authorized:', isIntroAuthorized)
    if (isIntroAuthorized && voiceSrc) {
      console.log('[RadioStation] Intro playback started:', voiceSrc)
    } else if (!isIntroAuthorized && voiceSrc) {
      const reason = !user ? 'guest mode' : `user ${user.id} not authorized`
      console.log('[RadioStation] Intro skipped —', reason, '→ starting playlist directly')
    } else {
      console.log('[RadioStation] No voice intro mapped — starting playlist directly')
    }

    setSongIndex(0)
    setSongError(null)
    setRuntimeInvalidSrcs(new Set())
    setDjVisible(false)
    clearTimeout(readyTimerRef.current)
    clearTimeout(skipTimerRef.current)

    const t = setTimeout(() => setDjVisible(true), 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood.id])

  // Long-stay messages
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

  const handleIntroEnded = useCallback(() => {
    console.log('[RadioStation] Voice intro ended → playlist playback starting')
    setIntroPhase('ready')
    readyTimerRef.current = setTimeout(() => setShowBanner(false), 2500)
  }, [])

  const handleHeartClick = () => {
    // Brief pulse animation
    setHeartBeat(true)
    clearTimeout(heartBeatRef.current)
    heartBeatRef.current = setTimeout(() => setHeartBeat(false), 600)
    setShowUnlock(true)
  }

  // Each handler simply records the user's intent and closes HeartUnlock.
  // The pendingAction effect (above) waits for auth + space to settle, then
  // executes the action — this avoids any race with the initial page load.

  const handleLetterFromUnlock = () => {
    setShowUnlock(false)
    console.log('[RadioStation] letter clicked | user:', user?.id ?? 'none', '| loadingAuth:', loadingAuth)
    setPendingAction('letter')
  }

  const handleDiaryFromUnlock = async () => {
    setShowUnlock(false)
    console.log('[RadioStation] diary clicked | user:', user?.id ?? 'none', '| space:', space?.id ?? 'none')
    if (!user) { setPendingAction('diary'); setShowAuthModal(true); return }
    // Always get a fresh space from the RPC — avoids stale context on first load
    console.log('[RadioStation] diary — calling refreshSpace...')
    const freshSpace = await refreshSpace()
    console.log('[RadioStation] diary — freshSpace:', freshSpace?.id ?? 'none')
    if (!freshSpace) { setPendingAction('diary'); setShowSpaceGate(true); return }
    setShowDiary(true)
  }

  const handleSpaceFromUnlock = () => {
    setShowUnlock(false)
    console.log('[RadioStation] space clicked | user:', user?.id ?? 'none')
    if (!user) { setPendingAction('space'); setShowAuthModal(true); return }
    setShowSpaceGate(true)
  }

  const handleRecordsFromUnlock = async () => {
    setShowUnlock(false)
    console.log('[RadioStation] records clicked | user:', user?.id ?? 'none', '| space:', space?.id ?? 'none')
    if (!user) { setPendingAction('records'); setShowAuthModal(true); return }
    console.log('[RadioStation] records — calling refreshSpace...')
    const freshSpace = await refreshSpace()
    console.log('[RadioStation] records — freshSpace:', freshSpace?.id ?? 'none')
    if (!freshSpace) { setPendingAction('records'); setShowSpaceGate(true); return }
    setShowRecords(true)
  }

  const handleVoiceFromUnlock = () => {
    setShowUnlock(false)
    console.log('[RadioStation] voice mailbox clicked | user:', user?.id ?? 'none')
    if (!user) { setPendingAction('voice'); setShowAuthModal(true); return }
    setShowVoiceMailbox(true)
  }

  const nextSong = useCallback(() => { setSongError(null); setSongIndex(i => (i + 1) % Math.max(songs.length, 1)) }, [songs.length])
  const prevSong = useCallback(() => { setSongError(null); setSongIndex(i => (i - 1 + Math.max(songs.length, 1)) % Math.max(songs.length, 1)) }, [songs.length])

  // Called only for genuine file errors (MediaError codes 2/3/4 — network,
  // decode, or src-not-supported).  Autoplay-blocked and AbortError are handled
  // inside RadioPlayer without reaching here, so everything that arrives here
  // is a truly broken file.
  const handleSongError = useCallback((msg) => {
    const failingSrc = songs[songIndex]?.src
    if (failingSrc) {
      console.warn('[RadioStation] real file error — marking invalid:', failingSrc)
      setRuntimeInvalidSrcs(prev => new Set([...prev, failingSrc]))
    }

    setSongError(msg)
    clearTimeout(skipTimerRef.current)
    // Brief pause so the user can see which song failed, then auto-advance
    skipTimerRef.current = setTimeout(() => {
      setSongError(null)
      setSongIndex(i => (i + 1) % Math.max(songs.length, 1))
    }, 800)
  }, [songs, songIndex])

  const currentSong = songs[songIndex]
    ? { ...songs[songIndex], reason: songs[songIndex].romanticReason, duration: '--:--' }
    : null

  return (
    <div className="station">

      {/* hidden intro audio */}
      {introPhase === 'playing' && voiceSrc && (
        <VoiceIntroPlayer key={mood.id} src={voiceSrc} onEnded={handleIntroEnded} />
      )}

      {/* long-stay toast */}
      {longStayMsg && (
        <LongStayToast
          message={longStayMsg}
          onDismiss={() => setLongStayMsg(null)}
        />
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
            {mood.icon} {mood.label}
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

        {/* atmosphere card */}
        <LocalAtmosphereCard atmosphere={atmosphere} />

        {/* DJ card — only visible inside the private couple space */}
        {djVisible && showDjCard && (
          <div className="station__dj">
            <div className="station__dj-avatar">🎙️</div>
            <div className="station__dj-bubble">
              <p className="station__dj-label">{djTimeLabel}</p>
              <p className="station__dj-text">「{mood.djIntro}」</p>
            </div>
          </div>
        )}

        {/* voice intro banner */}
        {showBanner && (
          <VoiceIntroBanner phase={introPhase} accentColor={mood.accentColor} />
        )}

        {/* rotating companion message */}
        <CompanionLine moodId={mood.id} />

        {/* song load error */}
        {songError && (
          <p style={{ color: '#f88', textAlign: 'center', fontSize: '0.85rem', margin: '0.5rem 0' }}>
            ⚠️ 歌曲加载失败：{songError}
          </p>
        )}

        {/* player */}
        {currentSong && (
          <RadioPlayer
            mood={mood}
            song={currentSong}
            onNext={nextSong}
            onPrev={prevSong}
            introPhase={introPhase}
            onSongError={handleSongError}
            autoStart={!isIntroAuthorized && !!voiceSrc}
          />
        )}

        {/* song list */}
        <SongList
          songs={songs}
          currentIndex={songIndex}
          onSelect={setSongIndex}
          accentColor={mood.accentColor}
        />

        <div className="station__cards">
          <AnniversaryCountdown />
          <MeetingCountdown />
        </div>

        <p className="station__hint">
          轻点那个 🤍，有个秘密在等你。
        </p>

        <LocalPlaylist />
      </main>

      {/* Step 1 — choice picker: both options shown at once */}
      {showUnlock && (
        <HeartUnlock
          onClose={() => setShowUnlock(false)}
          onLetter={handleLetterFromUnlock}
          onDiary={handleDiaryFromUnlock}
          onSpace={handleSpaceFromUnlock}
          onRecords={handleRecordsFromUnlock}
          onVoice={handleVoiceFromUnlock}
          onLogout={user ? () => { setShowUnlock(false); signOut() } : undefined}
        />
      )}

      {/* Step 2a — love letter */}
      {showLetter && (
        <HiddenLoveLetter onClose={() => setShowLetter(false)} />
      )}

      {/* Step 2b — private memory diary */}
      {showDiary && (
        <MemoryDiary
          onClose={() => setShowDiary(false)}
          mood={mood}
          currentSong={currentSong}
        />
      )}

      {/* Auth gate — shown when user taps heart without being logged in */}
      {showAuthModal && (
        <AuthModal onSuccess={() => setShowAuthModal(false)} />
      )}

      {/* Space gate — shown after login when user has no space yet, or from 双人空间 button */}
      {showSpaceGate && (
        <SpaceGate onSuccess={() => setShowSpaceGate(false)} />
      )}

      {/* Records list */}
      {showRecords && (
        <DiaryRecords onClose={() => setShowRecords(false)} />
      )}

      {/* Voice mailbox */}
      {showVoiceMailbox && (
        <VoiceMailbox onClose={() => setShowVoiceMailbox(false)} />
      )}
    </div>
  )
}
