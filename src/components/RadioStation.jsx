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
import { LONG_STAY } from '../utils/atmosphere'
import './RadioStation.css'

// ── song matching ─────────────────────────────────────────────────────────────

const FALLBACK_TAGS = ['需要安慰', '想被抱抱', '想一个人发呆']

function getStationSongs(moodLabel) {
  let matched = songMoodMap.filter(s => s.moodTags.includes(moodLabel))
  if (matched.length < 5) {
    const extra = songMoodMap.filter(
      s => !matched.includes(s) && s.moodTags.some(t => FALLBACK_TAGS.includes(t))
    )
    matched = [...matched, ...extra]
  }
  const sorted = matched.sort((a, b) => {
    const sc = s => [...s.title].reduce((n, c) => n + c.charCodeAt(0), 0)
    return sc(a) - sc(b)
  })
  return sorted.slice(0, 5)
}

// ── VoiceIntroPlayer ──────────────────────────────────────────────────────────

function VoiceIntroPlayer({ src, onEnded }) {
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      console.warn('[VoiceIntro] audio ref missing — skipping intro')
      onEnded()
      return
    }

    console.log('[VoiceIntro] Selected mood matched voice intro path:', src)

    audio.volume = 0.96
    audio.src = src
    audio.load()   // explicitly load before play()

    console.log('[VoiceIntro] Starting voice intro playback…')

    const p = audio.play()
    if (p) {
      p.then(() => {
        console.log('[VoiceIntro] ▶ Voice intro is playing:', src)
      }).catch(err => {
        console.error('[VoiceIntro] play() rejected:', err.name, err.message)
        console.warn('[VoiceIntro] Falling through to songs without intro')
        onEnded()
      })
    }

    return () => {
      audio.pause()
      audio.removeAttribute('src')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  return (
    <audio
      ref={audioRef}
      onEnded={() => {
        console.log('[VoiceIntro] ✓ Voice intro ended — starting songs now')
        onEnded()
      }}
      onError={e => {
        const err = e.target.error
        console.error('[VoiceIntro] Audio load error — code:', err?.code, 'message:', err?.message, 'src:', src)
        console.warn('[VoiceIntro] File not found or format unsupported — check public/voice-intros/')
        onEnded()
      }}
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
  const [introPhase, setIntroPhase]   = useState('ready')
  const [showBanner, setShowBanner]   = useState(false)
  const [longStayMsg, setLongStayMsg] = useState(null)

  const heartTimerRef   = useRef(null)
  const readyTimerRef   = useRef(null)
  const stayStartRef    = useRef(Date.now())
  const shownStayRef    = useRef(new Set())
  const stayIntervalRef = useRef(null)

  const songs    = getStationSongs(mood.id)
  const voiceSrc = moodVoiceMap[mood.id]

  // Mood change: reset audio, banner, DJ, intro
  useEffect(() => {
    console.log('[RadioStation] Mood selected:', mood.id)
    console.log('[RadioStation] Voice intro path:', voiceSrc || '(none — no file mapped)')

    setSongIndex(0)
    setDjVisible(false)
    setAudioUrl(null)
    clearTimeout(readyTimerRef.current)

    if (voiceSrc) {
      console.log('[RadioStation] Has voice intro → setting introPhase = "playing"')
      setIntroPhase('playing')
      setShowBanner(true)
    } else {
      console.log('[RadioStation] No voice intro → skipping to songs immediately')
      setIntroPhase('ready')
      setShowBanner(false)
    }

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
    console.log('[RadioStation] introPhase → "ready" — song player will auto-start')
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

  const nextSong = useCallback(() => setSongIndex(i => (i + 1) % songs.length), [songs.length])
  const prevSong = useCallback(() => setSongIndex(i => (i - 1 + songs.length) % songs.length), [songs.length])

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
