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
import AIRadioLine from './AIRadioLine'
import AuthModal from './AuthModal'
import SpaceGate from './SpaceGate'
import DiaryRecords from './DiaryRecords'
import VoiceMailbox from './VoiceMailbox'
import { useAuth } from '../contexts/AuthContext'
import { useSongLibrary } from '../hooks/useSongLibrary'
import { moodVoiceMap } from '../data/moodVoiceMap'
import { devValidateSongs } from '../data/songConfig'
import { LONG_STAY } from '../utils/atmosphere'
import { audioElement } from '../audio/audioElement'
import './RadioStation.css'

// ── song matching ─────────────────────────────────────────────────────────────

const FALLBACK_TAGS = ['需要安慰', '想被抱抱', '想一个人发呆']

// Pick a random starting index, avoiding the song that opened last time for
// this mood in the same browser session.
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

// Songs arrive pre-resolved from useSongLibrary — no resolveSongUrl call here.
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
  const { library, loading: libLoading } = useSongLibrary()

  // Must be computed before lazy useState so the initializers can read it.
  const isIntroAuthorized = user?.id === INTRO_AUTH_UID

  // ── Compute moodSongs and songs BEFORE songIndex so the lazy initializer can
  // pick a random starting index on the very first render (when library is
  // already cached).  This prevents RadioPlayer ever receiving a stale index-0
  // src followed immediately by the real random src — the double-fire that used
  // to trigger the isSwitching guard and leave audio/display out of sync.
  const initialIndexMoodRef = useRef(null)
  const moodSongs = useMemo(() => filterMoodSongs(library, mood.id), [library, mood.id])

  const [runtimeInvalidSrcs, setRuntimeInvalidSrcs] = useState(() => new Set())

  const songs = useMemo(() => {
    if (!runtimeInvalidSrcs.size) return moodSongs
    const filtered = moodSongs.filter(s => !runtimeInvalidSrcs.has(s.src))
    console.warn('[RadioStation] Invalid songs (removed from queue):', [...runtimeInvalidSrcs])
    console.log('[RadioStation] Valid playable songs (post-filter):', filtered.length)
    return filtered
  }, [moodSongs, runtimeInvalidSrcs])

  // Lazy init: if library is already cached pick the random song immediately so
  // the first render is already correct — no subsequent setSongIndex needed.
  const [songIndex, setSongIndex] = useState(() => {
    if (songs.length > 0) {
      const idx = pickRandomStartIndex(mood.id, songs)
      initialIndexMoodRef.current = mood.id
      return idx
    }
    return 0
  })
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
  const [songError, setSongError]     = useState(null)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [playTrigger, setPlayTrigger] = useState(0)

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

  const voiceSrc = moodVoiceMap[mood.id]

  // Dev-only: fire HEAD requests once to catch missing CDN files early
  useEffect(() => { devValidateSongs(moodSongs) }, [mood.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

    // Do NOT reset songIndex or initialIndexMoodRef here.
    // • On remount (key={stationKey}): lazy useState already picked the right
    //   random index; resetting to 0 would undo that and cause a double-fire
    //   in RadioPlayer (audio/display out of sync).
    // • If mood.id changes without remount: initialIndexMoodRef still holds the
    //   old mood.id, so the songs effect will correctly re-randomize.
    setSongError(null)
    setRuntimeInvalidSrcs(new Set())
    setDjVisible(false)
    clearTimeout(readyTimerRef.current)
    clearTimeout(skipTimerRef.current)

    const t = setTimeout(() => setDjVisible(true), 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood.id])

  // Pick a fresh random starting song whenever the song list becomes ready for
  // the current mood.  Runs once per mood entry; skipped on mid-session changes
  // to runtimeInvalidSrcs so the user's current position isn't disrupted.
  useEffect(() => {
    if (songs.length === 0) return
    if (initialIndexMoodRef.current === mood.id) return
    initialIndexMoodRef.current = mood.id
    setSongIndex(pickRandomStartIndex(mood.id, songs))
  // songs identity only changes when moodSongs or runtimeInvalidSrcs change;
  // mood.id triggers the reset above, so listing both is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, mood.id])

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

  // Called by RadioPlayer when autoplay is blocked by browser policy.
  // Shows the tap-to-enter overlay so the user can provide a fresh gesture.
  const handleAutoplayBlocked = useCallback(() => {
    console.log('[RadioStation] autoplay blocked — showing tap-to-enter overlay')
    setAutoplayBlocked(true)
  }, [])

  // Called when user taps the overlay.
  // Re-registers the gesture on the singleton audio element, dismisses the
  // overlay, then tells RadioPlayer to attempt playback via forceTrigger.
  const handleTapToStart = useCallback(() => {
    if (audioElement) audioElement.play().catch(() => {})
    setAutoplayBlocked(false)
    setPlayTrigger(t => t + 1)
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

  // Only expose currentSong once initialIndexMoodRef confirms the random pick
  // has been committed.  This ensures RadioPlayer mounts exactly once per entry
  // (with the correct song and autoplayNext=true), eliminating the rare
  // first-visit race where songs[0] is briefly valid before the songs effect
  // runs setSongIndex(randomIdx) and consumes the autoplayNext flag prematurely.
  const randomPickReady = initialIndexMoodRef.current === mood.id
  const currentSong = randomPickReady && songs[songIndex]
    ? { ...songs[songIndex], reason: songs[songIndex].romanticReason, duration: '--:--' }
    : null

  console.log('DISPLAY SONG:', currentSong?.title, currentSong?.src)

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

        {/* AI radio host opening line — generated per mood, cached for session */}
        <AIRadioLine mood={mood} />

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
            autoStart={introPhase !== 'playing'}
            onAutoplayBlocked={handleAutoplayBlocked}
            forceTrigger={playTrigger}
          />
        )}

        {/* song list */}
        <SongList
          songs={songs}
          currentIndex={songIndex}
          onSelect={setSongIndex}
          accentColor={mood.accentColor}
          allSongs={library}
          libraryLoading={libLoading}
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
          isPrivateSpace={space?.id === PRIVATE_SPACE_ID}
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

      {/* Tap-to-enter overlay — shown when browser blocks autoplay */}
      {autoplayBlocked && (
        <div
          className="station__tap-overlay"
          onClick={handleTapToStart}
          role="button"
          aria-label="轻触开始播放"
        >
          <div className="station__tap-inner">
            <span
              className="station__tap-icon"
              style={{ color: mood.accentColor }}
            >
              ♫
            </span>
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
