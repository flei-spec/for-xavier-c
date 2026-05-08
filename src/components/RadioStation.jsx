import { useState, useEffect, useRef, useCallback } from 'react'
import RadioPlayer from './RadioPlayer'
import SongList from './SongList'
import AnniversaryCountdown from './AnniversaryCountdown'
import VoiceRecorder from './VoiceRecorder'
import AudioUploader from './AudioUploader'
import HiddenLoveLetter from './HiddenLoveLetter'
import LocalPlaylist from './LocalPlaylist'
import LocalAtmosphereCard from './LocalAtmosphereCard'
import CompanionLine from './CompanionLine'
import { songMoodMap } from '../data/songMoodMap'
import { moodVoiceMap } from '../data/moodVoiceMap'
import { resolveSongUrl } from '../data/songConfig'
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
  let matched = songMoodMap.filter(s => s.moodTags.includes(moodLabel))

  if (matched.length === 0) {
    // Fallback: use soft emotional moods so the player is never empty
    matched = songMoodMap.filter(s =>
      FALLBACK_TAGS.some(t => s.moodTags.includes(t))
    )
    console.warn(`[RadioStation] No songs for "${moodLabel}" — using fallback pool (${matched.length})`)
  }

  // Resolve CDN URLs (no-op when CDN_BASE is empty)
  const resolved = matched.map(s => ({ ...s, src: resolveSongUrl(s.src) }))

  const shuffled = seededShuffle(resolved)
  console.log(`[RadioStation] Mood "${moodLabel}" — ${shuffled.length} song(s) loaded`)
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

export default function RadioStation({ mood, onBack, atmosphere }) {
  const [songIndex, setSongIndex]     = useState(0)
  const [audioUrl, setAudioUrl]       = useState(null)
  const [audioLabel, setAudioLabel]   = useState('')
  const [heartCount, setHeartCount]   = useState(0)
  const [showLetter, setShowLetter]   = useState(false)
  const [djVisible, setDjVisible]     = useState(false)
  // Lazy-initialize so VoiceIntroPlayer is in the DOM on the very first render.
  // Without this, VoiceIntroPlayer only mounts after the first useEffect fires,
  // adding an extra render cycle between the user's click and audio.play().
  const [introPhase, setIntroPhase]   = useState(() => moodVoiceMap[mood.id] ? 'playing' : 'ready')
  const [showBanner, setShowBanner]   = useState(() => !!moodVoiceMap[mood.id])
  const [longStayMsg, setLongStayMsg] = useState(null)
  const [songError, setSongError]     = useState(null)

  const heartTimerRef    = useRef(null)
  const readyTimerRef    = useRef(null)
  const skipTimerRef     = useRef(null)
  const stayStartRef     = useRef(Date.now())
  const shownStayRef     = useRef(new Set())
  const stayIntervalRef  = useRef(null)

  const songs    = getStationSongs(mood.id)
  const voiceSrc = moodVoiceMap[mood.id]

  // Mood change: reset playback state and kick off the DJ card animation.
  // introPhase and showBanner are lazy-initialized above so they're already
  // correct on the first render — this effect only matters if mood.id somehow
  // changes without a full component remount.
  useEffect(() => {
    console.log('[RadioStation] Mood selected:', mood.id)
    if (voiceSrc) {
      console.log(`[RadioStation] Voice intro path: ${voiceSrc}`)
    } else {
      console.log('[RadioStation] No voice intro mapped — skipping to songs immediately')
    }

    setSongIndex(0)
    setSongError(null)
    setDjVisible(false)
    setAudioUrl(null)
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
    console.log('[RadioStation] Voice intro ended, starting playlist')
    setIntroPhase('ready')
    readyTimerRef.current = setTimeout(() => setShowBanner(false), 2500)
  }, [])

  const handleHeartClick = () => {
    const next = heartCount + 1
    setHeartCount(next)
    clearTimeout(heartTimerRef.current)
    heartTimerRef.current = setTimeout(() => setHeartCount(0), 3500)
    if (next >= 5) {
      setShowLetter(true)
      setHeartCount(0)
      localStorage.setItem('xavier_letter_seen', 'true')
    }
  }

  const nextSong = useCallback(() => { setSongError(null); setSongIndex(i => (i + 1) % songs.length) }, [songs.length])
  const prevSong = useCallback(() => { setSongError(null); setSongIndex(i => (i - 1 + songs.length) % songs.length) }, [songs.length])

  // Auto-skip when a song fails to load (e.g. missing file on CDN/Vercel)
  const handleSongError = useCallback((msg) => {
    setSongError(msg)
    clearTimeout(skipTimerRef.current)
    skipTimerRef.current = setTimeout(() => {
      setSongError(null)
      setSongIndex(i => (i + 1) % songs.length)
    }, 2000)
  }, [songs.length])

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
          className={`station__heart ${heartCount > 0 ? 'station__heart--beat' : ''}`}
          onClick={handleHeartClick}
          title="💌"
        >
          {heartCount > 0 ? '❤️' : '🤍'}
          {heartCount > 0 && <span className="station__heart-count">{heartCount}/5</span>}
        </button>
      </header>

      {/* ── content ── */}
      <main className="station__content">

        {/* atmosphere card */}
        <LocalAtmosphereCard atmosphere={atmosphere} />

        {/* DJ card */}
        {djVisible && (
          <div className="station__dj">
            <div className="station__dj-avatar">🎙️</div>
            <div className="station__dj-bubble">
              <p className="station__dj-label">今晚的话</p>
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
            audioUrl={audioUrl}
            audioLabel={audioLabel}
            introPhase={introPhase}
            onSongError={handleSongError}
          />
        )}

        {/* song list */}
        <SongList
          songs={songs}
          currentIndex={songIndex}
          onSelect={setSongIndex}
          accentColor={mood.accentColor}
        />

        {/* bottom widgets */}
        <div className="station__grid">
          <AnniversaryCountdown />
          <VoiceRecorder
            onRecorded={url => { setAudioUrl(url); setAudioLabel('语音留言 💌') }}
          />
          <AudioUploader
            onUploaded={(url, name) => { setAudioUrl(url); setAudioLabel(name) }}
          />
        </div>

        <p className="station__hint">
          轻点那个 🤍 五次，有个秘密在等你。
        </p>

        <LocalPlaylist />
      </main>

      {showLetter && <HiddenLoveLetter onClose={() => setShowLetter(false)} />}
    </div>
  )
}
